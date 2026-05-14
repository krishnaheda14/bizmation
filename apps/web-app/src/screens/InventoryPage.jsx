import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const InventoryPage = () => {
  const [inventory, setInventory] = useState([]);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        setInventory(data);
      };
      reader.readAsBinaryString(file);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Inventory Management</h1>
      
      <div className="mb-4">
        <label htmlFor="file-upload" className="cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Upload Excel Sheet
        </label>
        <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx, .xls" />
        {fileName && <span className="ml-4">{fileName}</span>}
      </div>

      {inventory.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Inventory Data</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  {inventory[0].map((header, index) => (
                    <th key={index} className="py-2 px-4 border-b">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventory.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="py-2 px-4 border-b text-center">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            Generate Invoice
          </button>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
