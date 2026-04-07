const Checkbox = ({ checked, onChange, label, className = "", toggle = false, ...props }) => {
  if (toggle) {
    return (
      <label className={`flex items-center cursor-pointer gap-2 ${className}`}>
        <div className="relative">
          <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" {...props} />
          <div className={`w-11 h-6 rounded-full transition-colors ${checked ? "bg-[#2e7d5e]" : "bg-gray-300"}`} />
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
        </div>
        {label && <span className="text-sm text-gray-700">{label}</span>}
      </label>
    );
  }

  return (
    <label className={`flex items-center cursor-pointer ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="!w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        {...props}
      />
      {label && <span className="ml-2 text-sm text-gray-700">{label}</span>}
    </label>
  );
};

export default Checkbox;
