import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Input,
  Button,
  DataTable,
  PageHeader,
  Select,
  Modal,
} from "../Components";
import moment from "moment";

const Inventory = () => {
  const [inventoryData, setInventoryData] = useState([]);
  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(
    moment().format("YYYY-MM-DD"),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    moment().format("YYYY-MM"),
  );
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [dailyData, setDailyData] = useState({});

  useEffect(() => {
    fetchProducts();
    fetchInventoryData();
  }, [reportType, selectedDate, selectedMonth]);

  const fetchProducts = async () => {
    const snapshot = await getDocs(collection(db, "products"));
    setProducts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
  };

  const fetchInventoryData = async () => {
    let q;

    if (reportType === "daily") {
      q = query(
        collection(db, "dailyInventory"),
        where("date", "==", selectedDate),
        orderBy("createdAt", "desc"),
      );
    } else if (reportType === "monthly") {
      const startDate = moment(selectedMonth)
        .startOf("month")
        .format("YYYY-MM-DD");
      const endDate = moment(selectedMonth).endOf("month").format("YYYY-MM-DD");
      q = query(
        collection(db, "dailyInventory"),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "desc"),
      );
    } else {
      q = query(collection(db, "dailyInventory"), orderBy("date", "desc"));
    }

    try {
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log("Fetched inventory data:", data);
      setInventoryData(data);
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      setInventoryData([]);
    }
  };

  const openAddModal = () => {
    const initialData = {};
    products.forEach((product) => {
      initialData[product.id] = {
        newQty: 0,
        previousQty: product.quantity || 0,
        waste: 0,
        sold: 0,
      };
    });
    setDailyData(initialData);
    setShowModal(true);
  };

  const handleAddSingleProduct = async (productId, addQty, waste, sold) => {
    const today = moment().format("YYYY-MM-DD");
    const product = products.find((p) => p.id === productId);
    const data = dailyData[productId] || {
      newQty: 0,
      previousQty: 0,
      waste: 0,
      sold: 0,
    };
    const prevQty = Math.max(0, data.previousQty || 0);
    const totalAvailable = prevQty + addQty;
    const remainingQty = totalAvailable - sold - waste;

    // Check if record exists for today
    const q = query(
      collection(db, "dailyInventory"),
      where("productId", "==", productId),
      where("date", "==", today),
    );
    const existingSnapshot = await getDocs(q);

    if (!existingSnapshot.empty) {
      // Update existing record
      const existingDoc = existingSnapshot.docs[0];
      await updateDoc(doc(db, "dailyInventory", existingDoc.id), {
        previousRemaining: prevQty,
        newAdded: addQty,
        totalAvailable,
        sold,
        waste,
        remainingQty: Math.max(0, remainingQty),
        updatedAt: new Date(),
      });
    } else {
      // Create new record
      await addDoc(collection(db, "dailyInventory"), {
        productId: product.id,
        productName: product.name,
        date: today,
        previousRemaining: prevQty,
        newAdded: addQty,
        totalAvailable,
        sold,
        waste,
        remainingQty: Math.max(0, remainingQty),
        createdAt: new Date(),
      });
    }

    // Update product quantity
    await updateDoc(doc(db, "products", productId), {
      quantity: (product.quantity || 0) + addQty,
    });

    // Reset the form for this product
    setDailyData((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        newQty: 0,
        waste: 0,
        sold: 0,
      },
    }));

    fetchInventoryData();
  };

  const handleAddDaily = async () => {
    const today = moment().format("YYYY-MM-DD");

    for (const product of products) {
      const data = dailyData[product.id] || { newQty: 0, previousQty: 0 };
      const addQty = Math.max(0, data.newQty || 0);
      const prevQty = Math.max(0, data.previousQty || 0);
      const totalAvailable = prevQty + addQty;

      // Update product quantity
      await updateDoc(doc(db, "products", product.id), {
        quantity: (product.quantity || 0) + addQty,
      });

      await addDoc(collection(db, "dailyInventory"), {
        productId: product.id,
        productName: product.name,
        date: today,
        previousRemaining: prevQty,
        newAdded: addQty,
        totalAvailable,
        sold: 0,
        waste: 0,
        remainingQty: totalAvailable,
        createdAt: new Date(),
      });
    }

    setShowModal(false);
    fetchInventoryData();
  };
  const getColumns = () => {
    const baseColumns = [
      { header: "Product" },
      { header: "Date" },
      { header: "Previous" },
      { header: "Added" },
      { header: "Available" },
      { header: "Sold" },
      { header: "Waste" },
      { header: "Remaining" },
    ];

    if (reportType === "daily") {
      return baseColumns.filter((col) => col.header !== "Date");
    }
    return baseColumns;
  };

  const renderRow = (item) => (
    <tr key={item.id}>
      <td className="px-4 py-2 font-medium">{item.productName}</td>
      {reportType !== "daily" && (
        <td className="px-4 py-2">{moment(item.date).format("DD/MM/YYYY")}</td>
      )}
      <td className="px-4 py-2">{item.previousRemaining || 0}</td>
      <td className="px-4 py-2">{item.newAdded || 0}</td>
      <td className="px-4 py-2">{item.totalAvailable || 0}</td>
      <td className="px-4 py-2">{item.sold || 0}</td>
      <td className="px-4 py-2">{item.waste || 0}</td>
      <td className="px-4 py-2">{item.remainingQty || 0}</td>
    </tr>
  );

  const getTitle = () => {
    if (reportType === "daily") {
      return `Daily Inventory - ${moment(selectedDate).format("DD/MM/YYYY")}`;
    } else if (reportType === "monthly") {
      return `Monthly Inventory - ${moment(selectedMonth).format("MMMM YYYY")}`;
    }
    return "All Inventory Records";
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Inventory Reports"
        actions={[
          <Button key="add-daily" onClick={openAddModal}>
            Add Daily Inventory
          </Button>,
        ]}
      />

      <div className="mb-6 flex gap-4">
        <Select
          label="Report Type"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          options={[
            { value: "daily", label: "Daily" },
            { value: "monthly", label: "Monthly" },
            { value: "all", label: "All Records" },
          ]}
          mainClassName="w-48"
        />

        {reportType === "daily" && (
          <Input
            type="date"
            label="Select Date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            mainClassName="w-48"
          />
        )}

        {reportType === "monthly" && (
          <Input
            type="month"
            label="Select Month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            mainClassName="w-48"
          />
        )}
      </div>

      <DataTable
        title={getTitle()}
        columns={getColumns()}
        data={inventoryData}
        renderRow={renderRow}
        emptyMessage="No inventory data found"
      />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Daily Inventory"
        actions={[
          <Button key="cancel" onClick={() => setShowModal(false)}>
            Cancel
          </Button>,
          <Button key="add" onClick={handleAddDaily}>
            Add Inventory
          </Button>,
        ]}
      >
        <div className="w-full flex flex-col justify-center items-center gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-[#8fa5d81f] w-full flex flex-col justify-center p-4 rounded"
            >
              <div className={"flex justify-between items-center"}>
                <h2 className="font-medium">{product.name}</h2>
                <Button
                  onClick={() => {
                    const data = dailyData[product.id] || {
                      newQty: 0,
                      previousQty: 0,
                      waste: 0,
                      sold: 0,
                    };
                    const addQty = Math.max(0, data.newQty || 0);
                    const waste = Math.max(0, data.waste || 0);
                    const sold = Math.max(0, data.sold || 0);
                    handleAddSingleProduct(product.id, addQty, waste, sold);
                  }}
                >
                  Add
                </Button>
              </div>
              <div className={"w-full grid grid-cols-5 gap-4 items-center"}>
                <Input
                  type="number"
                  label="Previous Quantity"
                  value={dailyData[product.id]?.previousQty || 0}
                  onChange={(e) => {
                    const value = Math.max(0, parseFloat(e.target.value) || 0);
                    setDailyData((prev) => ({
                      ...prev,
                      [product.id]: {
                        ...prev[product.id],
                        previousQty: value,
                      },
                    }));
                  }}
                  inputProps={{ min: 0 }}
                />
                <Input
                  type="number"
                  label="Add Quantity"
                  value={dailyData[product.id]?.newQty || 0}
                  onChange={(e) => {
                    const value = Math.max(0, parseFloat(e.target.value) || 0);
                    setDailyData((prev) => ({
                      ...prev,
                      [product.id]: {
                        ...prev[product.id],
                        newQty: value,
                      },
                    }));
                  }}
                  inputProps={{ min: 0 }}
                />
                <Input
                  type="number"
                  label="Waste Quantity"
                  value={dailyData[product.id]?.waste || 0}
                  onChange={(e) => {
                    const value = Math.max(0, parseFloat(e.target.value) || 0);
                    setDailyData((prev) => ({
                      ...prev,
                      [product.id]: {
                        ...prev[product.id],
                        waste: value,
                      },
                    }));
                  }}
                  inputProps={{ min: 0 }}
                />
                <Input
                  type="number"
                  label="Sold Quantity"
                  value={dailyData[product.id]?.sold || 0}
                  onChange={(e) => {
                    const value = Math.max(0, parseFloat(e.target.value) || 0);
                    setDailyData((prev) => ({
                      ...prev,
                      [product.id]: {
                        ...prev[product.id],
                        sold: value,
                      },
                    }));
                  }}
                  inputProps={{ min: 0 }}
                />
                <Input
                  type="number"
                  label="Available"
                  value={(() => {
                    const data = dailyData[product.id] || {
                      newQty: 0,
                      previousQty: 0,
                      waste: 0,
                      sold: 0,
                    };
                    return Math.max(
                      0,
                      (data.previousQty || 0) +
                        (data.newQty || 0) -
                        (data.waste || 0) -
                        (data.sold || 0),
                    );
                  })()}
                  disabled
                />
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;
