#include <AccelStepper.h>
#include <Servo.h>

#define STEP_PIN 3
#define DIR_PIN 2
#define M0_PIN 7
#define M1_PIN 6
#define M2_PIN 5
#define RPWM 8 
#define LPWM 9
const long stepsPer90Degrees = 50; 

AccelStepper stepper(AccelStepper::DRIVER, STEP_PIN, DIR_PIN);
Servo servo;
Servo servo2;  // Second servo on GPIO 12
Servo servo3;  // Third servo on GPIO 22
Servo servo4;

int targetOutputCount = 0;
int currentPotCount = 0;
String activeBatchId = "";
bool isRunning = false;
unsigned long lastStatusPrint = 0;
const unsigned long STATUS_PRINT_INTERVAL = 30000; // Print status every 30 seconds

void setup() {
  Serial.begin(115200);  // For PC Monitor
  Serial1.begin(115200); // For ESP8266
  Serial.println("\n=== COCOPEAT ARDUINO MEGA STARTING ===");
  Serial.println("Waiting for commands from ESP8266...");

  pinMode(M0_PIN, OUTPUT);
  pinMode(M1_PIN, OUTPUT);
  pinMode(M2_PIN, OUTPUT);
  servo.attach(11); 
  servo.write(83);   // Default position set to 83
  
  servo2.attach(12);
  servo2.write(83);  // Default position set to 83

  servo3.attach(10);
  servo3.write(90);  // Stop position for continuous rotation servo

  servo4.attach(22);
  servo4.write(90);  // Stop position for continuous rotation servo

  digitalWrite(M0_PIN, LOW);
  digitalWrite(M1_PIN, LOW);
  digitalWrite(M2_PIN, LOW);

  stepper.setMaxSpeed(600);
  stepper.setAcceleration(400);
  
  Serial.println("=== SETUP COMPLETE - READY FOR BATCHES ===\n");
}

void pourcup(){
  // Continuous rotation servo: 90=stop, <90=CW, >90=CCW
  
  // Rotate: servo3 clockwise, servo4 counter-clockwise
  servo3.write(60);   // 90 - 25 = Clockwise
  servo4.write(110);  // 90 + 25 = Counter-clockwise
  delay(100);
  
  // Stop both servos
  servo3.write(90);  // Stop position
  servo4.write(90);  // Stop position
  delay(100);
}
void pourpeat(){
  // Move from 83 to 140
  servo.write(140);
  delay(2000); // Wait at 140
  
  // Start motor for 1 second
  analogWrite(RPWM, 255); // Full speed forward
  analogWrite(LPWM, 0);
  delay(1000); // Run for 1 second
  
  // Stop motor
  analogWrite(RPWM, 0);
  analogWrite(LPWM, 0);
  
  // Return back to default 83
  servo.write(83);
  delay(2000); 
}

void pourseed(){
  // Move from 83 to 140
  servo2.write(140);
  delay(2000); // Wait at 140
  
  // Return back to default 83
  servo2.write(83);
  delay(2000); 
}

void rotate(){
  stepper.move(stepsPer90Degrees); 
  stepper.runToPosition();  
}

void completePotCycle() {
  Serial.println("--- Starting Pot Cycle ---");
  
  // 1. Pour cup
  pourcup();
  
  // Increment and update count after pourcup
  currentPotCount++;
  Serial.print("Pot Completed: ");
  Serial.println(currentPotCount);
  
  // Send count back to ESP
  Serial1.print("POT_COUNT:");
  Serial1.println(currentPotCount);
  
  delay(2000);
  
  // 2. Rotate
  rotate();
  delay(2000);
  
  // 3. Pour peat (moves to 140 then back to 83)
  pourpeat();
  delay(2000);
  
  rotate();
  delay(2000);
  // 4. Pour seed (second servo)
  pourseed();
  delay(2000);
  
  // 5. Final rotate
  rotate();
  delay(2000);
  
  Serial.println("--- Pot Cycle Complete ---");
}

void parseReceivedData(String data) {
  // Expected format: "START:batchId:outputCount" or "STOP"
  
  if (data.startsWith("START:")) {
    // Parse the batch data
    int firstColon = data.indexOf(':');
    int secondColon = data.indexOf(':', firstColon + 1);
    
    if (secondColon > 0) {
      activeBatchId = data.substring(firstColon + 1, secondColon);
      targetOutputCount = data.substring(secondColon + 1).toInt();
      
      Serial.println("=== BATCH STARTED ===");
      Serial.print("Batch ID: ");
      Serial.println(activeBatchId);
      Serial.print("Target Output: ");
      Serial.println(targetOutputCount);
      
      isRunning = true;
      currentPotCount = 0;
      
      // Acknowledge to ESP
      Serial1.println("ACK_START");
    }
  } else if (data.startsWith("STOP")) {
    Serial.println("=== BATCH STOPPED ===");
    isRunning = false;
    activeBatchId = "";
    targetOutputCount = 0;
    currentPotCount = 0;
    
    Serial.println("✓ Arduino ready for next batch");
    
    // Acknowledge to ESP
    Serial1.println("ACK_STOP");
  }
}

void loop() {
  // Always check for data from ESP (continuous listening)
  if (Serial1.available() > 0) {
    String receivedData = Serial1.readStringUntil('\n');
    receivedData.trim();
    
    if (receivedData.length() > 0) {
      Serial.print("Received from ESP: ");
      Serial.println(receivedData);
      parseReceivedData(receivedData);
    }
  }

  // If running and haven't completed all pots yet
  if (isRunning && currentPotCount < targetOutputCount) {
    completePotCycle();
  } else if (isRunning && currentPotCount >= targetOutputCount) {
    // Batch completed
    Serial.println("=== ALL POTS COMPLETED ===");
    Serial.print("Total Pots: ");
    Serial.println(currentPotCount);
    
    // Notify ESP that batch is complete
    Serial1.println("BATCH_COMPLETE");
    
    // Reset state and ready for next batch
    isRunning = false;
    activeBatchId = "";
    targetOutputCount = 0;
    currentPotCount = 0;
    
    Serial.println("✓ Arduino reset - ready for next batch");
  }
  
  // Print periodic status when idle to show Arduino is alive
  if (!isRunning) {
    unsigned long currentTime = millis();
    if (currentTime - lastStatusPrint >= STATUS_PRINT_INTERVAL) {
      Serial.println("Status: IDLE - Listening for new batch...");
      lastStatusPrint = currentTime;
    }
  }
  
  delay(100);  // Small delay to prevent tight loop
}
