import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CreateRoom from "./components/CreateRoom";
import JoinRoom from "./components/JoinRoom";
import RoomDetails from "./components/RoomDetails";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<CreateRoom />} />
          <Route path="/rooms/join/:roomId" element={<JoinRoom />} />
          <Route path="/rooms/:roomId/details" element={<RoomDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
