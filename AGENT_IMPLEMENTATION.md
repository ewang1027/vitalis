# Multimodal Agentic Workflow - Implementation Guide

## Architecture Overview

The multimodal agentic workflow is built using a layered architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│              (AgentChat Component)                       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Agent Orchestrator                      │
│        (OpenRouter + Claude 3.5 Sonnet)                 │
│              Function Calling Engine                     │
└─────────────────────────────────────────────────────────┘
                           ↓
            ┌──────────────┴──────────────┐
            ↓                              ↓
┌──────────────────────┐      ┌──────────────────────┐
│  Context Gathering   │      │   Action Execution   │
│     Services         │      │      Services        │
└──────────────────────┘      └──────────────────────┘
            ↓                              ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase Database Layer                     │
│    (Patients, Rooms, Equipment, Tasks, Vitals, etc.)   │
└─────────────────────────────────────────────────────────┘
            ↓                              ↓
┌──────────────────────┐      ┌──────────────────────┐
│  Real-time Subs      │      │   Visualization      │
│  (Task Updates)      │      │   Triggers           │
└──────────────────────┘      └──────────────────────┘
            ↓                              ↓
┌─────────────────────────────────────────────────────────┐
│              3D Hospital Map Visualization               │
│           (TaskPathAnimation Component)                  │
└─────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Context Gatherer Service

**File:** `src/services/contextGatherer.ts`

**Purpose:** Fetch comprehensive, accurate context from the database.

**Key Functions:**

```typescript
// Get all information about a specific room
async function getRoomContext(
  roomIdentifier: string | number
): Promise<RoomContext | null>

// Returns:
{
  room: Room,
  patient: Patient | null,
  assignment: RoomAssignment | null,
  vitals: Vitals[],
  equipment: Equipment[],
  tasks: Task[],
  alerts: Alert[],
  assignedStaff: {
    doctor: Staff | null,
    nurse: Staff | null
  }
}
```

```typescript
// Get all information about a patient
async function getPatientContext(
  patientIdentifier: string | number
): Promise<PatientContext | null>

// Get equipment information
async function getEquipmentContext(
  equipmentIdentifier: string | number
): Promise<EquipmentContext | null>

// Get overall hospital status
async function getHospitalContext(): Promise<HospitalContext>
```

**Implementation Details:**

- Uses Supabase queries with joins
- Caches context for performance
- Handles both IDs and natural identifiers (room number, patient name)
- Returns null if not found (graceful failure)

### 2. Agent Tools Service

**File:** `src/services/agentTools.ts`

**Purpose:** Execute actions in the database.

**Tool Interface:**

```typescript
interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  visualizationNeeded?: boolean;
  visualizationData?: {
    taskType: VisualTaskType;
    sourceRoomId?: string;
    targetRoomId?: string;
    taskId?: string;
  };
}
```

**Key Tools:**

1. **checkInPatient(params)** - Admit new patient
   - Creates patient record
   - Finds/assigns room
   - Creates room assignment
   - Sets up initial vitals
   - Returns visualization data for onboarding

2. **dischargePatient(params)** - Discharge patient
   - Marks patient as inactive
   - Deactivates room assignment
   - Frees up room

3. **transferPatient(params)** - Transfer between rooms
   - Validates availability
   - Creates new assignment
   - Updates room statuses
   - Returns visualization data for transfer path

4. **createTask(params)** - Create tasks
   - Supports 10+ task types
   - Maps to database actions
   - Returns visualization data

5. **updateVitals(params)** - Update patient vitals

6. **assignStaff(params)** - Assign doctor/nurse

**Error Handling:**

All tools return a `ToolResult` with `success: false` on errors:

```typescript
try {
  // ... tool logic
  return {
    success: true,
    message: 'Success message',
    data: { ... }
  };
} catch (error: any) {
  return {
    success: false,
    message: `Error: ${error.message}`
  };
}
```

### 3. Agent Orchestrator

**File:** `src/services/agentOrchestrator.ts`

**Purpose:** Main agentic workflow engine using OpenRouter function calling.

**Key Function:**

```typescript
async function runAgent(
  userMessage: string,
  conversationHistory: AgentMessage[],
  onUpdate?: (update: StreamUpdate) => void
): Promise<AgentResponse>
```

**Flow:**

1. **Build Context**
   ```typescript
   const messages: AgentMessage[] = [
     { role: 'system', content: systemPrompt },
     ...conversationHistory,
     { role: 'user', content: userMessage }
   ];
   ```

2. **Call OpenRouter with Tools**
   ```typescript
   const response = await fetch(OPENROUTER_API_URL, {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       model: 'anthropic/claude-3.5-sonnet',
       messages,
       tools: AGENT_TOOLS,
       tool_choice: 'auto'
     })
   });
   ```

3. **Handle Tool Calls**
   ```typescript
   while (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
     for (const toolCall of assistantMsg.tool_calls) {
       const toolName = toolCall.function.name;
       const toolArgs = JSON.parse(toolCall.function.arguments);

       // Execute tool
       const result = await executeTool(toolName, toolArgs);

       // Add to message history
       messages.push({
         role: 'tool',
         content: JSON.stringify(result),
         tool_call_id: toolCall.id,
         name: toolName
       });
     }

     // Continue conversation with tool results
     const nextResponse = await fetch(...);
   }
   ```

4. **Return Results**
   ```typescript
   return {
     message: assistantMessage,
     toolResults,
     visualizationData,
     requiresVisualization,
     conversationHistory
   };
   ```

**Tool Definitions:**

Tools are defined using OpenRouter's function calling schema:

```typescript
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_room_context',
      description: 'Get comprehensive information about a specific room...',
      parameters: {
        type: 'object',
        properties: {
          room_identifier: {
            type: 'string',
            description: 'Room ID or room number (e.g., "102", "room-uuid")'
          }
        },
        required: ['room_identifier']
      }
    }
  },
  // ... 12 more tools
];
```

### 4. Visualization Manager

**File:** `src/hooks/useAgentVisualization.ts`

**Purpose:** Trigger pathfinding animations when actions occur.

**Key Function:**

```typescript
const triggerVisualization = async (request: VisualizationRequest) => {
  // Create task in database
  const { data: task } = await supabase
    .from('tasks')
    .insert({
      title: `${taskType} - Room ${roomNumber}`,
      action: mapTaskTypeToAction(taskType),
      status: 'active',
      room_id: targetRoomId
    })
    .select()
    .single();

  // Real-time subscription in useTaskSubscription picks this up
  // TaskPathAnimation component renders the visualization
};
```

**Visualization Flow:**

```
Agent executes tool
    ↓
Tool returns visualizationNeeded: true
    ↓
Agent calls triggerVisualization()
    ↓
Insert task into database
    ↓
Real-time subscription fires (useTaskSubscription)
    ↓
TaskPathAnimation component detects new task
    ↓
Renders animated dotted path on 3D map
    ↓
Progress updates automatically
```

### 5. Agent Chat Component

**File:** `src/components/AgentChat.tsx`

**Purpose:** User interface for the agent with streaming progress.

**Key Features:**

1. **Message Display**
   ```typescript
   interface Message {
     id: string;
     role: 'user' | 'assistant' | 'system';
     content: string;
     timestamp: Date;
     toolCalls?: Array<{ name: string; args: any; result?: any }>;
     visualizationTriggered?: boolean;
   }
   ```

2. **Progress Updates**
   ```typescript
   const handleSend = async () => {
     const response = await runAgent(
       userMessage,
       conversationHistory,
       (update: StreamUpdate) => {
         // Show progress in real-time
         setCurrentProgress(prev => [...prev, update]);
       }
     );
   };
   ```

3. **Visualization Indicators**
   - Shows when visualizations are triggered
   - Links to the 3D map view

### 6. Integration Hook

**File:** `src/hooks/useAgentWorkflow.ts`

**Purpose:** Simplified hook for integrating agent into existing components.

**Usage:**

```typescript
const {
  processMessage,
  isProcessing,
  progressUpdates,
  conversationHistory
} = useAgentWorkflow();

const handleSubmit = async (message: string) => {
  const result = await processMessage(
    message,
    (update) => console.log('Progress:', update)
  );

  if (result.success) {
    console.log('Response:', result.message);
    console.log('Tools executed:', result.toolsExecuted);
    console.log('Visualization:', result.visualizationTriggered);
  }
};
```

## Database Schema Requirements

### Tables Used

1. **patients**
   - id, name, age, gender, condition, severity, admission_date, discharge_date, is_active

2. **rooms**
   - id, room_number, room_name, room_type, status, floor, position_x, position_y, position_z

3. **room_assignments**
   - id, room_id, patient_id, assigned_doctor_id, assigned_nurse_id, assigned_at, discharged_at, is_active

4. **vitals**
   - id, patient_id, room_id, heart_rate, blood_pressure, temperature, oxygen_saturation, respiratory_rate, recorded_at

5. **equipment**
   - id, name, equipment_type, current_room_id, is_rental, state, position_x, position_y, position_z

6. **tasks**
   - id, title, reason, priority, action, status, room_id, equipment_id, assigned_to_id

7. **alerts**
   - id, room_id, alert_type, message, is_active, resolved_at

8. **staff**
   - id, name, role, specialty, phone, email, avatar_url, is_online

### Real-time Subscriptions

Required subscriptions for the agent to work properly:

```sql
-- Enable real-time for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
```

## Performance Considerations

### 1. Context Gathering Optimization

- Use parallel queries where possible
- Cache frequently accessed data
- Limit vitals history to last 10 records

```typescript
const [
  { data: rooms },
  { data: patients },
  { data: equipment }
] = await Promise.all([
  supabase.from('rooms').select('*'),
  supabase.from('patients').select('*'),
  supabase.from('equipment').select('*')
]);
```

### 2. Agent Response Time

- Average response time: 2-5 seconds
- Tool execution: 500ms - 2s per tool
- Visualization trigger: < 500ms

### 3. OpenRouter Rate Limits

- Claude 3.5 Sonnet: Generous limits
- Implement request queuing if needed
- Add retry logic for transient failures

## Error Handling

### 1. Database Errors

```typescript
try {
  const { data, error } = await supabase
    .from('patients')
    .insert({ ... });

  if (error) {
    return {
      success: false,
      message: `Database error: ${error.message}`
    };
  }
} catch (error) {
  return {
    success: false,
    message: `Unexpected error: ${error.message}`
  };
}
```

### 2. API Errors

```typescript
const response = await fetch(OPENROUTER_API_URL, { ... });

if (!response.ok) {
  throw new Error(`OpenRouter API error: ${response.statusText}`);
}
```

### 3. Tool Execution Errors

All tools return a standardized `ToolResult`:

```typescript
{
  success: false,
  message: 'User-friendly error message'
}
```

The agent will present this to the user and potentially retry or ask for clarification.

## Testing

### Unit Tests

Test individual tools:

```typescript
describe('checkInPatient', () => {
  it('should create patient and assign room', async () => {
    const result = await checkInPatient({
      name: 'Test Patient',
      age: 30,
      gender: 'male',
      condition: 'test condition'
    });

    expect(result.success).toBe(true);
    expect(result.data.patient).toBeDefined();
    expect(result.data.room).toBeDefined();
  });
});
```

### Integration Tests

Test full agent workflows:

```typescript
describe('Agent Workflow', () => {
  it('should check in patient and trigger visualization', async () => {
    const response = await runAgent(
      'Check in patient John Doe, age 45, male, with pneumonia'
    );

    expect(response.message).toContain('Successfully checked in');
    expect(response.requiresVisualization).toBe(true);
    expect(response.toolResults).toHaveLength(1);
  });
});
```

### Manual Test Scenarios

1. **Patient Check-in Flow**
   - Input: "Check in a new patient"
   - Expected: Agent asks for details, creates patient, assigns room, shows visualization

2. **Room Query Flow**
   - Input: "What's in room 102?"
   - Expected: Agent returns comprehensive room information

3. **Task Creation Flow**
   - Input: "Send bedsheets to room 101"
   - Expected: Agent creates task, triggers green path visualization

## Deployment

### Environment Variables

```env
VITE_OPENROUTER_API_KEY=sk-or-v1-xxxxx
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```

### Build

```bash
npm run build
```

### Production Considerations

1. **API Key Security**
   - Store OpenRouter API key server-side for production
   - Use environment-specific keys

2. **Rate Limiting**
   - Implement request throttling
   - Add user-level rate limits

3. **Monitoring**
   - Log all agent interactions
   - Track tool execution times
   - Monitor API costs

## Future Enhancements

### Short-term

- [ ] Add conversation memory persistence
- [ ] Implement conversation summarization
- [ ] Add support for batch operations
- [ ] Improve error recovery

### Long-term

- [ ] Multi-agent coordination
- [ ] Predictive task scheduling
- [ ] Voice input/output
- [ ] Custom agent training on hospital data
- [ ] Advanced analytics and reporting

## References

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Claude Function Calling](https://docs.anthropic.com/claude/docs/tool-use)
- [Supabase Real-time](https://supabase.com/docs/guides/realtime)
- [Three.js Documentation](https://threejs.org/docs/)

---

**Maintainers:** HackNYU Team
**Last Updated:** 2025-01-16
