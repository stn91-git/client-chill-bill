import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../config/constants';

interface FormData {
  roomName: string;
  name: string;
  upiId: string;
  joinLink?: string;
}

const CreateRoom: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    roomName: "",
    name: "",
    upiId: "",
  });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/rooms/create`,
        {
          roomName: formData.roomName,
          name: formData.name,
          upiId: formData.upiId,
        }
      );

      if (response.data.room.joinLink) {
        await navigator.clipboard.writeText(response.data.room.joinLink);
      }

      navigate(`/rooms/${response.data.room.id}/details`);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create a New Room
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="roomName" className="sr-only">
                Room Name
              </label>
              <input
                id="roomName"
                name="roomName"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Room Name"
                value={formData.roomName}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="name" className="sr-only">
                Your Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="upiId" className="sr-only">
                UPI ID
              </label>
              <input
                id="upiId"
                name="upiId"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="UPI ID"
                value={formData.upiId}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {loading ? "Creating..." : "Create Room"}
            </button>
          </div>
        </form>

        {formData.joinLink && (
          <div className="mt-4 p-4 bg-green-50 rounded-md">
            <p className="text-green-700 text-sm font-medium">
              Room created successfully!
            </p>
            <p className="text-sm mt-2">Share this link with others to join:</p>
            <input
              type="text"
              readOnly
              value={formData.joinLink}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateRoom;
