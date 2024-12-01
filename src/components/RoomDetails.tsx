import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FiUpload } from "react-icons/fi";

interface Participant {
  id: string;
  name: string;
  upiId: string;
  joinedAt: string;
}

interface RoomData {
  id: string;
  name: string;
  creator: {
    id: string;
    name: string;
    upiId: string;
  };
  participants: Participant[];
  isActive: boolean;
}

interface ReceiptItem {
  item_name: string;
  quantity: number;
  price: number;
  total: number;
  tags?: string[];
}

interface ReceiptData {
  items: ReceiptItem[];
  total?: number;
  cgst?: number;
  sgst?: number;
  serviceCharge?: number;
  netAmount?: number;
  bill_details?: {
    restaurant_name?: string;
    bill_number?: string;
    date?: string;
    time?: string;
  };
}

interface ItemTag {
  userId: string;
  userName: string;
}

const RoomDetails: React.FC = () => {
  const { roomId } = useParams();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [userShares, setUserShares] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const response = await axios.get(
          `http://localhost:3001/api/rooms/${roomId}`
        );
        setRoom(response.data.room);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || "Failed to fetch room details"
        );
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      fetchRoomDetails();
    }
  }, [roomId]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/rooms/join/${roomId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join Room: ${room?.name}`,
          text: `Join our bill splitting room: ${room?.name}`,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Share failed:", err);
        await copyToClipboard(shareUrl);
      }
    } else {
      await copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setShowSnackbar(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Please upload only JPEG or PNG images");
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const response = await axios.post(
        `http://localhost:3001/api/rooms/${roomId}/upload-receipt`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setReceiptData(response.data);
      console.log(response.data);

      setShowSnackbar(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to upload receipt");
    } finally {
      setUploadLoading(false);
    }
  };

  const calculateShares = useCallback(() => {
    if (!receiptData || !room) return;

    const shares: { [key: string]: number } = {};

    room.participants.forEach((participant) => {
      shares[participant.id] = 0;
    });

    receiptData.items.forEach((item, index) => {
      const taggedUsers = item.tags || [];
      if (taggedUsers.length > 0) {
        const sharePerPerson = item.total / taggedUsers.length;
        taggedUsers.forEach((userId) => {
          shares[userId] = (shares[userId] || 0) + sharePerPerson;
        });
      }
    });

    const sharedCosts =
      (receiptData.serviceCharge || 0) +
      (receiptData.cgst || 0) +
      (receiptData.sgst || 0);
    const sharedCostPerPerson = sharedCosts / room.participants.length;

    room.participants.forEach((participant) => {
      shares[participant.id] += sharedCostPerPerson;
    });

    setUserShares(shares);
  }, [receiptData, room]);

  const handleTagToggle = async (itemIndex: number) => {
    if (!room || !receiptData) return;

    const currentUser = room.participants.find((p) => p.id === room.creator.id);
    if (!currentUser) return;

    const item = receiptData.items[itemIndex];
    const isTagged = item.tags?.includes(currentUser.id);
    const action = isTagged ? "remove" : "add";

    try {
      const response = await axios.post(
        `http://localhost:3001/api/rooms/${roomId}/items/${itemIndex}/tags`,
        {
          userId: currentUser.id,
          action,
        }
      );

      if (response.data.success) {
        setReceiptData((prev) => {
          if (!prev) return prev;
          const newItems = [...prev.items];
          newItems[itemIndex] = {
            ...newItems[itemIndex],
            tags: response.data.items[itemIndex].tags,
          };
          return { ...prev, items: newItems };
        });
      }
    } catch (error) {
      console.error("Failed to update tags:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading room details...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error || "Room not found"}</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {copySuccess ? "Copied!" : "Share Room"}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Created by
              </h2>
              <p className="text-gray-600">{room.creator.name}</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Participants
              </h2>
              <div className="space-y-4">
                {room.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <p className="font-medium text-gray-900">
                      {participant.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Joined: {new Date(participant.joinedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Upload Receipt
              </h2>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FiUpload className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or
                      drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG or JPG</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png"
                    onChange={handleFileUpload}
                    disabled={uploadLoading}
                  />
                </label>
              </div>
            </div>

            {receiptData && (
              <div className="mt-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700">
                    Receipt Details
                  </h3>
                  {receiptData.bill_details && (
                    <div className="mt-2 text-sm text-gray-600">
                      {receiptData.bill_details.restaurant_name && (
                        <p className="font-medium">
                          {receiptData.bill_details.restaurant_name}
                        </p>
                      )}
                      <div className="flex gap-4 mt-1">
                        {receiptData.bill_details.bill_number && (
                          <p>Bill #{receiptData.bill_details.bill_number}</p>
                        )}
                        {receiptData.bill_details.date && (
                          <p>{receiptData.bill_details.date}</p>
                        )}
                        {receiptData.bill_details.time && (
                          <p>{receiptData.bill_details.time}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="space-y-4">
                      {receiptData.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.item_name}</p>
                            <p className="text-sm text-gray-500">
                              Quantity: {item.quantity ?? 1}
                            </p>
                            <div className="mt-2">
                              <button
                                onClick={() => handleTagToggle(index)}
                                className={`px-3 py-1 text-sm rounded-full ${
                                  item.tags?.includes(room.creator.id)
                                    ? "bg-indigo-100 text-indigo-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {item.tags?.includes(room.creator.id)
                                  ? "Tagged"
                                  : "Tag Me"}
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              ₹{(item.price ?? 0).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">
                              @₹{(item.price ?? 0).toFixed(2)} each
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Split between: {item.tags?.length || 0} people
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-80 bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-4">
                      Your Share Summary
                    </h3>
                    <div className="space-y-2">
                      {room.participants.map((participant) => (
                        <div
                          key={participant.id}
                          className="flex justify-between items-center"
                        >
                          <span className="text-gray-700">
                            {participant.name}{" "}
                            {participant.id === room.creator.id ? "(You)" : ""}
                          </span>
                          <span className="font-medium">
                            ₹{(userShares[participant.id] || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default RoomDetails;
