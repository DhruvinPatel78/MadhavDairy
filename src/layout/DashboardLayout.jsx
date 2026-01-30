import Sidebar from "../components/Sidebar";

const DashboardLayout = ({ children }) => {
    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;
