import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FiUpload } from "react-icons/fi";

interface Participant {
  userId: string;
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
  item: string;
  quantity: number;
  price: number;
  tags: string[];
}

interface Receipt {
  items: ReceiptItem[];
  total: number;
  cgst: number;
  sgst: number;
  serviceCharge: number;
  netAmount: number;
}

interface ItemTag {
  userId: string;
  userName: string;
}

interface PaymentRequest {
  amount: number;
  from: string;
  to: string;
  roomId: string;
  items: string[];
}

const RoomDetails: React.FC = () => {
  const { roomId } = useParams();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<Receipt | null>(null);
  const [userShares, setUserShares] = useState<{ [key: string]: number }>({});
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);

  const calculateShares = useCallback((items: ReceiptItem[]) => {
    const shares: { [key: string]: number } = {};

    items.forEach((item, index) => {
      const taggedUsers = item.tags || [];
      if (taggedUsers.length > 0) {
        const shareAmount = item.price / taggedUsers.length;
        taggedUsers.forEach((userId) => {
          shares[userId] = (shares[userId] || 0) + shareAmount;
        });
      }
    });

    setUserShares(shares);
  }, []);

  const fetchRoomDetails = useCallback(async () => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/rooms/${roomId}`
      );
      setRoom(response.data.room);

      if (response.data.room.receipt) {
        setReceiptData(response.data.room.receipt);
        calculateShares(response.data.room.receipt.items);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to fetch room details");
    } finally {
      setLoading(false);
    }
  }, [roomId, calculateShares]);

  useEffect(() => {
    if (roomId) {
      fetchRoomDetails();
    }
  }, [roomId, fetchRoomDetails]);

  useEffect(() => {
    if (room) {
      const lastParticipant = room.participants[room.participants.length - 1];
      setCurrentUser(lastParticipant);
    }
  }, [room]);

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
      await fetchRoomDetails();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to upload receipt");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleTagToggle = async (itemIndex: number) => {
    if (!room || !receiptData) return;

    const currentUser = room.participants[room.participants.length - 1];
    if (!currentUser) {
      console.error("No current user found");
      return;
    }

    console.log("Current User:", currentUser);

    const item = receiptData.items[itemIndex];
    const isTagged = item.tags?.includes(currentUser.userId);
    const action = isTagged ? "remove" : "add";

    console.log("Attempting to", action, "tag for item", itemIndex);

    try {
      const response = await axios.post(
        `http://localhost:3001/api/rooms/${roomId}/items/${itemIndex}/tags`,
        {
          userId: currentUser.userId,
          action,
        }
      );

      console.log("Tag response:", response.data);

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

        calculateShares(response.data.items);
      }
    } catch (error) {
      console.error("Failed to update tags:", error);
    }
  };

  const hasAnyTags = useCallback(() => {
    if (!receiptData?.items) return false;
    return receiptData.items.some((item) => item.tags && item.tags.length > 0);
  }, [receiptData]);

  const handleRequestPayment = async (participantId: string) => {
    if (!room || !receiptData) return;

    const participant = room.participants.find(
      (p) => p.userId === participantId
    );
    if (!participant) return;

    const amount = userShares[participantId] || 0;
    if (amount <= 0) return;

    try {
      const taggedItems = receiptData.items
        .filter((item) => item.tags?.includes(participantId))
        .map((item) => item.item);

      const upiLink = `upi://pay?pa=${
        participant.upiId
      }&pn=${encodeURIComponent(participant.name)}&am=${amount.toFixed(
        2
      )}&cu=INR`;

      window.open(upiLink, "_blank");
      console.log("Payment request sent to:", upiLink);
      setShowSnackbar(true);
      setTimeout(() => setShowSnackbar(false), 3000);
    } catch (error) {
      console.error("Failed to request payment:", error);
      setError("Failed to send payment request");
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
                    key={participant.userId}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">
                          {participant.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          Joined:{" "}
                          {new Date(participant.joinedAt).toLocaleString()}
                        </p>
                        {userShares[participant.userId] > 0 && (
                          <p className="text-sm font-medium text-indigo-600 mt-1">
                            Share: ₹{userShares[participant.userId].toFixed(2)}
                          </p>
                        )}
                      </div>
                      {userShares[participant.userId] > 0 &&
                        participant.userId !== room.creator.id &&
                        currentUser?.userId === participant.userId && (
                          <button
                            onClick={() =>
                              handleRequestPayment(participant.userId)
                            }
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Request Payment
                          </button>
                        )}
                    </div>
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
              <div className="mt-4">
                <h3 className="text-lg font-medium">Receipt Items</h3>
                <div className="mt-2 space-y-2">
                  {receiptData.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.item}</div>
                        <div className="text-sm text-gray-600">
                          Quantity: {item.quantity} × ₹{item.price}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div>₹{item.price}</div>
                          <button
                            onClick={() => handleTagToggle(index)}
                            className={`text-sm px-3 py-1 rounded ${
                              currentUser &&
                              item.tags.includes(currentUser.userId)
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {currentUser &&
                            item.tags.includes(currentUser.userId)
                              ? "Tagged"
                              : "Tag Me"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{receiptData.total}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>CGST:</span>
                    <span>₹{receiptData.cgst}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>SGST:</span>
                    <span>₹{receiptData.sgst}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Service Charge:</span>
                    <span>₹{receiptData.serviceCharge}</span>
                  </div>
                  <div className="flex justify-between font-medium mt-2">
                    <span>Total Amount:</span>
                    <span>₹{receiptData.netAmount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showSnackbar && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg">
          Payment request sent successfully!
        </div>
      )}
    </>
  );
};

export default RoomDetails;
