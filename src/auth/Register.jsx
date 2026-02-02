import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

const Register = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            navigate("/");
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="h-screen flex items-center justify-center">
            <form
                onSubmit={handleRegister}
                className="bg-white p-6 rounded shadow w-96"
            >
                <h2 className="text-xl font-bold mb-4">Register</h2>

                <input
                    type="email"
                    placeholder="Email"
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="w-full border border-gray-300 px-4 py-2.5 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2.5 rounded-lg font-medium transition-colors shadow-sm">
                    Register
                </button>
            </form>
        </div>
    );
};

export default Register;
