import { Navigate } from "react-router-dom";
import { auth } from "../firebase";

const ProtectedRoute = ({ children }) => {
    const userData = localStorage.getItem('madhavDairyUser');
    return (auth.currentUser || userData) ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
