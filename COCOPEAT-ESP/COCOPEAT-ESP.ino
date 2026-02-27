#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>

#define WIFI_SSID "FTTH"
#define WIFI_PASS "DALIA2025"

#define API_KEY "AIzaSyBnsMn7BGMa2egBv_kVaqEECy-xiIHcRm0"
#define USER_EMAIL "cocopeat@gmail.com"
#define USER_PASSWORD "21void"
#define FIREBASE_PROJECT_ID "cocopeat-d2bd3"
#define DATABASE_URL "https://cocopeat-d2bd3-default-rtdb.asia-southeast1.firebasedatabase.app"

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool isRunning = false;
bool previousRunningState = false;
int outputCount = 0;
int currentPotsDone = 0;
String activeBatchId = "";
bool dataSentToArduino = false;
unsigned long lastStatusPrint = 0;
const unsigned long STATUS_PRINT_INTERVAL = 30000; // Print status every 30 seconds when idle
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 5000; // Update heartbeat every 5 seconds

void setup() {
  // ESP8266 hardware serial (TX/RX pins)
  // Match this baud rate with the Mega's Serial1 rate
  Serial.begin(115200); 
  delay(1000);

  Serial.println("\n\n=== COCOPEAT ESP8266 STARTING ===");

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());

  // Firebase setup
  config.api_key = API_KEY;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.database_url = DATABASE_URL;
  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("Firebase initialized");
  
  // Wait a moment for Firebase to be ready
  delay(2000);
  
  // Set initial heartbeat
  if (Firebase.ready()) {
    Firebase.RTDB.setTimestamp(&fbdo, "/espStatus/lastHeartbeat");
    Firebase.RTDB.setBool(&fbdo, "/espStatus/isConnected", true);
    Firebase.RTDB.setString(&fbdo, "/espStatus/wifiSSID", WIFI_SSID);
    Firebase.RTDB.setInt(&fbdo, "/espStatus/wifiRSSI", WiFi.RSSI());
    Firebase.RTDB.setString(&fbdo, "/espStatus/ipAddress", WiFi.localIP().toString());
    Serial.println("Initial heartbeat sent to Firebase");
  }
  
  // Check initial state on startup
  if (Firebase.ready() && Firebase.RTDB.getBool(&fbdo, "/deviceControl/isRunning")) {
    isRunning = fbdo.boolData();
    previousRunningState = isRunning;
    
    Serial.print("Initial state check - isRunning: ");
    Serial.println(isRunning ? "true" : "false");
    
    if (isRunning) {
      // If a batch is already running, fetch details
      Serial.println("Batch in progress detected on startup - fetching details...");
      fetchBatchDetails();
      sendBatchDataToArduino();
    } else {
      Serial.println("No active batch - ready for new batch");
    }
  }
  
  Serial.println("=== SETUP COMPLETE - ENTERING MAIN LOOP ===\n");
}

void fetchBatchDetails() {
  // Fetch active batch ID from machine state
  int retryCount = 0;
  const int maxRetries = 5;
  bool success = false;
  
  while (retryCount < maxRetries && !success) {
    if (Firebase.ready() && Firebase.RTDB.getString(&fbdo, "/machineState/activeBatchId")) {
      String batchIdData = fbdo.stringData();
      
      // Check if we got a valid batch ID (not null, not empty, not "null" string)
      if (fbdo.dataType() == "string" && 
          batchIdData.length() > 0 && 
          batchIdData != "null" && 
          batchIdData != "NULL" &&
          batchIdData != "") {
        
        activeBatchId = batchIdData;
        Serial.print("Active Batch ID: ");
        Serial.println(activeBatchId);
        
        // Fetch output count for this batch
        String batchPath = "/batches/" + activeBatchId + "/outputCount";
        if (Firebase.RTDB.getInt(&fbdo, batchPath.c_str())) {
          outputCount = fbdo.intData();
          Serial.print("Output Count: ");
          Serial.println(outputCount);
          
          // Get current potsDoneCount
          String potsDonePath = "/batches/" + activeBatchId + "/potsDoneCount";
          if (Firebase.RTDB.getInt(&fbdo, potsDonePath.c_str())) {
            currentPotsDone = fbdo.intData();
            Serial.print("Pots Done: ");
            Serial.println(currentPotsDone);
          }
          
          success = true;
        } else {
          Serial.println("Failed to fetch output count, retrying...");
        }
      } else {
        Serial.print("No active batch found (attempt ");
        Serial.print(retryCount + 1);
        Serial.print("/");
        Serial.print(maxRetries);
        Serial.println("). Retrying...");
      }
    } else {
      Serial.println("Failed to fetch active batch ID, retrying...");
    }
    
    if (!success) {
      retryCount++;
      delay(1000); // Wait 1 second before retry
    }
  }
  
  if (!success) {
    Serial.println("ERROR: Could not fetch batch details after retries!");
    activeBatchId = "";
    outputCount = 0;
    currentPotsDone = 0;
  }
}

void sendBatchDataToArduino() {
  // Validate data before sending
  if (activeBatchId.length() == 0 || outputCount <= 0) {
    Serial.println("ERROR: Cannot send invalid batch data to Arduino!");
    Serial.print("  Batch ID: ");
    Serial.println(activeBatchId.length() > 0 ? activeBatchId : "[EMPTY]");
    Serial.print("  Output Count: ");
    Serial.println(outputCount);
    return;
  }
  
  // Send batch data to Arduino Mega via Serial
  // Format: "START:batchId:outputCount"
  String message = "START:" + activeBatchId + ":" + String(outputCount);
  Serial.println(message);  // Send to Arduino via Serial (TX/RX)
  Serial.print("Sent to Arduino: ");
  Serial.println(message);
  dataSentToArduino = true;
}

void sendStopToArduino() {
  Serial.println("STOP");  // Send to Arduino via Serial
  Serial.println("Sent STOP to Arduino");
  dataSentToArduino = false;
}

void updateHeartbeat() {
  // Update connection status in Firebase
  if (Firebase.ready()) {
    unsigned long currentTime = millis();
    
    if (currentTime - lastHeartbeat >= HEARTBEAT_INTERVAL) {
      // Update heartbeat data with server timestamp (milliseconds since epoch)
      if (Firebase.RTDB.setTimestamp(&fbdo, "/espStatus/lastHeartbeat")) {
        Firebase.RTDB.setBool(&fbdo, "/espStatus/isConnected", true);
        Firebase.RTDB.setString(&fbdo, "/espStatus/wifiSSID", WIFI_SSID);
        Firebase.RTDB.setInt(&fbdo, "/espStatus/wifiRSSI", WiFi.RSSI());
        Firebase.RTDB.setString(&fbdo, "/espStatus/ipAddress", WiFi.localIP().toString());
      }
      
      lastHeartbeat = currentTime;
    }
  }
}

void updatePotCountInFirebase(int potCount) {
  if (activeBatchId.length() > 0 && Firebase.ready()) {
    String potsDonePath = "/batches/" + activeBatchId + "/potsDoneCount";
    
    if (Firebase.RTDB.setInt(&fbdo, potsDonePath.c_str(), potCount)) {
      Serial.print("Updated Firebase - Pots Done: ");
      Serial.println(potCount);
      currentPotsDone = potCount;
      
      // Check if batch is complete
      if (potCount >= outputCount) {
        Serial.println("=== BATCH COMPLETE - UPDATING FIREBASE ===");
        
        // 1. Update batch status to Finished
        String statusPath = "/batches/" + activeBatchId + "/status";
        Firebase.RTDB.setString(&fbdo, statusPath.c_str(), "Finished");
        Serial.println("✓ Batch status set to Finished");
        
        // 2. Clear active batch ID from machine state (set to null)
        Firebase.RTDB.setString(&fbdo, "/machineState/activeBatchId", "null");
        Serial.println("✓ Cleared activeBatchId from machineState");
        
        // 3. Set device control to stopped
        Firebase.RTDB.setBool(&fbdo, "/deviceControl/isRunning", false);
        Firebase.RTDB.setInt(&fbdo, "/deviceControl/updatedAt", millis());
        Serial.println("✓ Device control set to STOPPED");
        
        // 4. Send STOP command to Arduino
        sendStopToArduino();
        
        // 5. Reset ESP state to be ready for next batch
        previousRunningState = false;
        isRunning = false;
        
        Serial.println("=== BATCH COMPLETION SUCCESSFUL ===");
        Serial.println("✓ ESP ready for next batch");
        
        // Clear local state
        activeBatchId = "";
        outputCount = 0;
        currentPotsDone = 0;
      }
    } else {
      Serial.print("Failed to update pot count: ");
      Serial.println(fbdo.errorReason());
    }
  }
}

void checkArduinoResponse() {
  // Check if Arduino sent any data via Serial
  if (Serial.available() > 0) {
    String response = Serial.readStringUntil('\n');
    response.trim();
    
    if (response.length() > 0) {
      Serial.print("Received from Arduino: ");
      Serial.println(response);
      
      // Parse pot count update: "POT_COUNT:5"
      if (response.startsWith("POT_COUNT:")) {
        int count = response.substring(10).toInt();
        Serial.print("Arduino completed pot #");
        Serial.println(count);
        
        // Update Firebase
        updatePotCountInFirebase(count);
      } 
      else if (response.startsWith("BATCH_COMPLETE")) {
        Serial.println("Arduino reports: Batch Complete!");
        // The updatePotCountInFirebase already handles completion
      }
      else if (response.startsWith("ACK_START")) {
        Serial.println("✓ Arduino acknowledged START command");
      }
      else if (response.startsWith("ACK_STOP")) {
        Serial.println("✓ Arduino acknowledged STOP command");
      }
    }
  }
}

void checkDeviceControl() {
  // Fetch device control status (isRunning)
  if (Firebase.ready() && Firebase.RTDB.getBool(&fbdo, "/deviceControl/isRunning")) {
    isRunning = fbdo.boolData();
    
    // Check if state changed from false to true (batch started)
    if (isRunning && !previousRunningState) {
      Serial.println("=== BATCH STARTED ===");
      Serial.print("Status: ");
      Serial.println(isRunning ? "RUNNING" : "STOPPED");
      
      // Wait a moment for Firebase to propagate all data
      Serial.println("Waiting for Firebase data propagation...");
      delay(500);
      
      // Fetch batch details when starting
      fetchBatchDetails();
      
      // Only send to Arduino if we got valid batch details
      if (activeBatchId.length() > 0 && outputCount > 0) {
        sendBatchDataToArduino();
      } else {
        Serial.println("ERROR: Failed to get batch details, not starting batch!");
        // Reset the running state since we can't proceed
        isRunning = false;
      }
      
    } else if (!isRunning && previousRunningState) {
      Serial.println("=== BATCH STOPPED ===");
      Serial.print("Status: ");
      Serial.println(isRunning ? "RUNNING" : "STOPPED");
      
      // Send stop command to Arduino
      sendStopToArduino();
      
      // Clear all state
      activeBatchId = "";
      outputCount = 0;
      currentPotsDone = 0;
      
      Serial.println("✓ ESP ready for next batch");
      
    } else {
      // No state change - print status periodically to show ESP is alive
      unsigned long currentTime = millis();
      if (currentTime - lastStatusPrint >= STATUS_PRINT_INTERVAL) {
        Serial.print("Status check: ");
        Serial.print(isRunning ? "RUNNING" : "IDLE");
        if (isRunning && activeBatchId.length() > 0) {
          Serial.print(" | Progress: ");
          Serial.print(currentPotsDone);
          Serial.print("/");
          Serial.print(outputCount);
        }
        Serial.println();
        lastStatusPrint = currentTime;
      }
    }
    
    // Always update previous state
    previousRunningState = isRunning;
    
  } else {
    Serial.println("Failed to fetch device control status.");
    Serial.print("Error: ");
    Serial.println(fbdo.errorReason());
  }
}

void loop() {
  // Update heartbeat to show ESP is connected
  updateHeartbeat();
  
  // Always check device control status (continuous monitoring)
  checkDeviceControl();
  
  // Check for Arduino responses multiple times to avoid missing messages
  for (int i = 0; i < 10; i++) {
    checkArduinoResponse();
    delay(200);  // Check every 200ms, 10 times = 2 seconds total
  }
}

