import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('madhavDairyUser');
        if (userData) {
            navigate("/");
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            localStorage.setItem('madhavDairyUser', JSON.stringify({
                uid: userCredential.user.uid,
                email: userCredential.user.email
            }));
            navigate("/");
        } catch (err) {
            alert("Invalid credentials");
        }
    };

    return (
        <div className="w-full h-screen flex items-center justify-center">
            <form
                onSubmit={handleLogin}
                className="bg-white p-6 rounded shadow"
            >
                <h2 className="text-xl font-bold mb-4">Welcome Madhav Dairy</h2>

                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        className="w-full border border-gray-300 px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                    Login
                </button>
            </form>
        </div>
    );
};

export default Login;
