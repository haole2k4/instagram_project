import React, { Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Login from "../Components/Auth/Login";
import Register from "../Components/Auth/Register";
import DefaultLayout from "../Layout/DefaultLayout/DefaultLayout";
import AdminLayout from "../Layout/AdminLayout/AdminLayout";
import AdminRoute from "../Admin/AdminRoute";
import Dashboard from "../Admin/Dashboard";
import Reports from "../Admin/Reports";
import ReportDetail from "../Admin/ReportDetail";
import Users from "../Admin/Users";
import UserDetail from "../Admin/UserDetail";
import Content from "../Admin/Content";
import AuditLogs from "../Admin/AuditLogs";
import PrivateRouter from "./PrivateRoutes/PrivateRoutes";
import { PostCardSkeleton } from "../Components/Common/FlatSkeleton";
import CallPage from "../Pages/Call/CallPage";

const RouterApp = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh w-full bg-ig-ground px-4 py-8">
          <PostCardSkeleton />
        </div>
      }
    >
      <Routes>
        {/* ROUTE FOR LOGIN AND REGISTER */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ROUTE FOR CALL (DEDICATED FULLSCREEN PAGE) */}
        <Route
          path="/call"
          element={
            <PrivateRouter>
              <CallPage />
            </PrivateRouter>
          }
        />

        {/* ROUTE FOR ADMIN */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="content" element={<Content />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>

        {/* ROUTE FOR USER APP */}
        <Route
          path="/*"
          element={
            <PrivateRouter>
              <DefaultLayout />
            </PrivateRouter>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default RouterApp;
