import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

interface JoinFormData {
  name: string;
  upiId: string;
}

interface RoomDetails {
  id: string;
  name: string;
  creator: {
    id: string;
    name: string;
    upiId: string;
  };
  isActive: boolean;
}

const JoinRoom: React.FC = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<JoinFormData>({
    name: "",
    upiId: "",
  });
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!roomId) {
        setError("Invalid room ID");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `http://localhost:3001/api/rooms/${roomId}`,
          {
            timeout: 5000,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data && response.data.room) {
          console.log("Room data received:", response.data.room);
          setRoom(response.data.room);
          setError("");
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err: any) {
        console.error("Error fetching room:", err);
        if (err.code === "ERR_NETWORK") {
          setError(
            "Unable to connect to server. Please check your internet connection."
          );
        } else if (err.response?.status === 404) {
          setError("Room not found");
        } else {
          setError(
            err?.response?.data?.message || 
            err.message || 
            "Failed to fetch room details"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRoomDetails();
  }, [roomId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setJoining(true);

    if (!roomId) {
      setError("Invalid room ID");
      setJoining(false);
      return;
    }

    try {
      console.log("Submitting join request:", { roomId, formData });
      const response = await axios.post(
        `http://localhost:3001/api/rooms/join/${roomId}`,
        formData,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.room) {
        console.log("Join successful:", response.data);
        navigate(`/rooms/${roomId}/details`);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err: any) {
      console.error("Error joining room:", err);
      if (err.code === "ERR_NETWORK") {
        setError(
          "Unable to connect to server. Please check your internet connection."
        );
      } else if (err.response?.status === 404) {
        setError("Room not found");
      } else {
        setError(err?.response?.data?.message || "Failed to join room");
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading room details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-6 bg-white rounded-lg shadow-md">
          <div className="text-center">
            <div className="text-red-600 mb-4 font-medium">{error}</div>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Room not found</div>
          <button
            onClick={() => navigate("/")}
            className="text-indigo-600 hover:text-indigo-800"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  if (!room.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">This room is no longer active</div>
          <button
            onClick={() => navigate("/")}
            className="text-indigo-600 hover:text-indigo-800"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Join Room: {room.name}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Created by {room.creator.name}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Your Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
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
              disabled={joining}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {joining ? "Joining..." : "Join Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinRoom;
