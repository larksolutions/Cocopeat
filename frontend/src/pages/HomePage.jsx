import Navbar from "../components/Navbar";
import { useState, useEffect, useMemo, useRef } from "react"; // <-- Import useRef
import RateLimitedUI from "../components/RateLimitedUI";
import { toast } from "react-hot-toast";
import BatchCard from "../components/BatchCard";
import api from "../lib/axios";
import NotFound from "../components/NotFound";
import { LoaderIcon } from "lucide-react"; // <-- Import loader

// --- This component is needed for the dashboard ---
const SupplyStatus = ({ label, level }) => {
    const isLow = level === 0; // 0 = Low, 1 = Sufficient
    const statusText = isLow ? 'Low' : 'Sufficient';
    const colorClass = isLow ? 'text-error' : 'text-success';

    return (
        <div className="flex justify-between items-center p-4 bg-base-100 rounded-lg shadow">
            <span className="label-text font-medium">{label}</span>
            <span className={`font-bold ${colorClass} badge badge-outline badge-lg`}>{statusText}</span>
        </div>
    );
};

const ESPConnectionStatus = ({ espStatus }) => {
    if (!espStatus) {
        return (
            <div className="p-4 bg-base-100 rounded-lg shadow">
                <div className="flex justify-between items-center">
                    <span className="label-text font-medium">ESP32 Connection</span>
                    <span className="badge badge-outline badge-lg text-warning">Checking...</span>
                </div>
            </div>
        );
    }

    const { isConnected, wifiSSID, wifiRSSI, ipAddress, timeSinceLastHeartbeat } = espStatus;
    const statusText = isConnected ? 'Connected' : 'Offline';
    const colorClass = isConnected ? 'text-success' : 'text-error';
    
    // Signal strength indicator
    const getSignalStrength = (rssi) => {
        if (rssi >= -50) return 'Excellent';
        if (rssi >= -60) return 'Good';
        if (rssi >= -70) return 'Fair';
        return 'Weak';
    };

    return (
        <div className="p-4 bg-base-100 rounded-lg shadow">
            <div className="flex justify-between items-center mb-2">
                <span className="label-text font-medium">ESP32 Connection</span>
                <span className={`font-bold ${colorClass} badge badge-outline badge-lg`}>{statusText}</span>
            </div>
            {isConnected && (
                <div className="text-xs text-base-content/60 space-y-1">
                    <div className="flex justify-between">
                        <span>WiFi:</span>
                        <span className="font-mono">{wifiSSID || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Signal:</span>
                        <span className="font-mono">{wifiRSSI ? `${wifiRSSI} dBm (${getSignalStrength(wifiRSSI)})` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>IP:</span>
                        <span className="font-mono">{ipAddress || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Last seen:</span>
                        <span className="font-mono">{timeSinceLastHeartbeat ? `${timeSinceLastHeartbeat}s ago` : 'Just now'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
// ---

function HomePage() {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [batches, setBatches] = useState([]); 
  const [machineState, setMachineState] = useState(null); 
  const [espStatus, setEspStatus] = useState(null); // <-- ESP connection status
  const [loadingBatches, setLoadingBatches] = useState(true); // <-- Split loading state
  const [loadingState, setLoadingState] = useState(true); // <-- Split loading state
  
  const pollingRef = useRef(null); // <-- Add ref for polling
  const previousActiveBatchIdRef = useRef(null); // <-- Track previous active batch ID

  // --- Fetch Batch History Function (can be called multiple times) ---
  const fetchBatchHistory = async () => {
    try {
      const batchRes = await api.get("/batch");
      setBatches(batchRes.data);
      setIsRateLimited(false);
    } catch (error) {
      console.error("Error fetching batch history:", error);
      if (error.response && error.response.status === 429) {
        setIsRateLimited(true);
      } else {
        toast.error("Failed to load batch history");
      }
    }
  };

  // --- Effect 1: Fetch Batch History (ONCE on mount) ---
  useEffect(() => {
    const loadInitialBatches = async () => {
      setLoadingBatches(true);
      await fetchBatchHistory();
      setLoadingBatches(false);
    };

    loadInitialBatches();
  }, []); // Empty array, runs only once on mount

  // --- Effect 2: Fetch Machine State + ESP Status + Set up Polling ---
  useEffect(() => {
    const fetchMachineState = async () => {
      try {
        const stateRes = await api.get("/batch/machine-state"); // <-- New API call
        const newMachineState = stateRes.data;
        
        // Check if batch status changed (from active to inactive)
        const previousBatchId = previousActiveBatchIdRef.current;
        const currentBatchId = newMachineState.activeBatchId;
        
        // If batch just finished (was active, now inactive), refresh batch list
        if (previousBatchId && !currentBatchId) {
          console.log("Batch completed - refreshing batch list");
          await fetchBatchHistory();
          toast.success("Batch completed! You can now start a new batch.");
        }
        
        // Update the ref with current batch ID
        previousActiveBatchIdRef.current = currentBatchId;
        
        setMachineState(newMachineState);
      } catch (error) {
        console.error("Error polling machine state:", error);
        // We don't show a toast on polling errors, it gets annoying
      } finally {
        setLoadingState(false);
      }
    };

    const fetchESPStatus = async () => {
      try {
        const espRes = await api.get("/batch/esp-status");
        setEspStatus(espRes.data);
      } catch (error) {
        console.error("Error polling ESP status:", error);
      }
    };

    const pollAll = async () => {
      await Promise.all([fetchMachineState(), fetchESPStatus()]);
    };

    pollAll(); // Run once immediately
    
    // Set up the polling interval
    pollingRef.current = setInterval(pollAll, 3000); // Polls every 3 seconds

    // Cleanup function:
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []); // Empty array, runs once to set up polling

  // --- Memos (now update in real-time) ---
  const isBatchActive = useMemo(() => {
    // Check if there's an active batch ID AND it's not null/empty
    if (!machineState || !machineState.activeBatchId) {
      return false;
    }
    
    // Additional safety check: verify the batch actually exists and is active
    const activeBatch = batches.find(b => b._id === machineState.activeBatchId);
    if (activeBatch) {
      // Only consider it active if status is Ongoing or Paused
      return activeBatch.status === 'Ongoing' || activeBatch.status === 'Paused';
    }
    
    // If we have an activeBatchId but can't find the batch in our list,
    // assume it's active (batch list might not be updated yet)
    return true;
  }, [machineState, batches]);

  const areSuppliesLow = useMemo(() => {
    if (!machineState) return true; // Default to 'low' (disabled) while loading
    return machineState.soilLevel === 0 || machineState.cupLevel === 0;
  }, [machineState]);

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar 
        isBatchActive={isBatchActive} 
        areSuppliesLow={areSuppliesLow} 
      />

      {isRateLimited && <RateLimitedUI />}

      <div className="max-w-7xl mx-auto p-4 mt-6">
        
        {/* --- ADDED: Machine State Dashboard --- */}
        <div className="mb-6">
            <h2 className="text-2xl font-bold mb-4">Machine Status</h2>
            {/* --- This section now updates every 3 seconds --- */}
            {loadingState ? (
                <div className="text-center"><LoaderIcon className="animate-spin size-6" /></div>
            ) : machineState ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <SupplyStatus label="Soil Supply Level" level={machineState.soilLevel} />
                    <SupplyStatus label="Potting Cup Supply Level" level={machineState.cupLevel} />
                    <ESPConnectionStatus espStatus={espStatus} />
                </div>
            ) : (
                <div className="text-center text-error">Could not load machine status.</div>
            )}
        </div>
        
        <h2 className="text-2xl font-bold mb-4">Batch History</h2>

        {/* --- This section only loads once --- */}
        {loadingBatches && (
          <div className="text-center py-10"><LoaderIcon className="animate-spin size-6" /></div>
        )}

        {batches.length === 0 && !loadingBatches && !isRateLimited && <NotFound />}

        {batches.length > 0 && !isRateLimited && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batches.map((batch) => (
              <BatchCard key={batch._id} batch={batch} setBatch={setBatches}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default HomePage;

