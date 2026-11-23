import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const AdminRoute = ({ children, requireAdmin = false }) => {
  const { isLoggedIn, roles } = useSelector((state) => state.login);
  const isAdmin =
    roles?.includes("ADMIN") || roles?.includes("ROLE_ADMIN");
  const isStaff =
    isAdmin ||
    roles?.includes("MODERATOR") ||
    roles?.includes("ROLE_MODERATOR");

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  if (!isStaff) {
    return <Navigate to="/user/home" replace />;
  }
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  return children;
};

export default AdminRoute;
