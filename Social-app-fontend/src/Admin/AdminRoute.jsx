import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
  const { isLoggedIn, roles } = useSelector((state) => state.login);
  const isStaff =
    roles?.includes("ADMIN") || roles?.includes("MODERATOR");

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  if (!isStaff) {
    return <Navigate to="/user/home" replace />;
  }
  return children;
};

export default AdminRoute;
