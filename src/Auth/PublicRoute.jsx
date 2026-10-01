import { Navigate } from "react-router";
import { useAuth } from "./AuthContext";
import { isAuthFlowPending } from "../utils/authStorage";

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user && !isAuthFlowPending()
    ? <Navigate to="/" replace />
    : children;
}
