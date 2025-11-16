# Multimodal Agentic Workflow - User Guide

## Overview

The **AI Agent Assistant** is a multimodal agentic workflow system that uses OpenRouter (Claude 3.5 Sonnet) to provide intelligent hospital management capabilities with:

1. **Accurate context gathering** from the database
2. **Action execution** (patient check-ins, task creation, transfers, etc.)
3. **Automatic visualizations** (pathfinding animations on the 3D map)
4. **Real-time progress feedback** during execution

## How to Use

### Accessing the AI Agent

1. Launch the application
2. Click on the **"AI Agent"** tab in the left sidebar (Bot icon)
3. The AI Agent chat interface will open in the middle panel

### Features

#### 1. Context-Aware Queries

The agent automatically gathers comprehensive context from the database for any query:

**Examples:**
- "What's happening in room 102?"
  - Returns: patient info, vitals, equipment, tasks, alerts, assigned staff
- "Tell me about patient John Doe"
  - Returns: patient details, current room, vitals history, assigned staff
- "Show me the hospital overview"
  - Returns: all rooms, patients, equipment, active tasks, alerts

#### 2. Action Execution

The agent can perform various actions autonomously:

**Patient Management:**
```
"Check in a new patient"
"Admit patient named Sarah Johnson, age 45, female, with pneumonia"
"Transfer patient from room 101 to room 205"
"Discharge patient [patient-id]"
```

**Task Creation:**
```
"Send bedsheets to room 101"
"Deliver food to room 102"
"Clean room 103 - urgent"
"Send medication to room 104"
"Transfer equipment to room 105"
```

**Staff Assignment:**
```
"Assign Dr. Smith to patient [patient-id]"
"Assign a nurse to the patient in room 102"
```

**Vitals Updates:**
```
"Update vitals for patient [patient-id]: heart rate 85, temperature 99.2"
```

#### 3. Automatic Visualizations

When certain actions are performed, the agent automatically triggers 3D pathfinding visualizations:

- **Patient Check-in:** Shows onboarding path to the assigned room
- **Patient Transfer:** Shows dotted line from source to destination room
- **Task Delivery:** Shows green dotted path for deliveries (food, bedsheets, medication, etc.)
- **Equipment Transfer:** Shows path from source to destination

**Example:**
```
User: "Send bedsheets to room 101"
Agent:
1. Creates the task in the database
2. Triggers visualization showing green dotted line from supply room to room 101
3. Shows animated progress indicator on the 3D map
4. Confirms completion
```

#### 4. Progress Feedback

The agent provides real-time feedback as it works:

- **Progress indicators:** "Processing your request..."
- **Tool execution:** "Executing: get_room_context"
- **Tool completion:** "Completed: get_room_context"
- **Final message:** Detailed summary of actions taken

## Architecture

### Components

1. **Context Gatherer** (`src/services/contextGatherer.ts`)
   - Queries database for comprehensive context
   - Functions: `getRoomContext()`, `getPatientContext()`, `getEquipmentContext()`, `getHospitalContext()`

2. **Agent Tools** (`src/services/agentTools.ts`)
   - Executes actions in the database
   - Tools: `checkInPatient()`, `transferPatient()`, `createTask()`, `updateVitals()`, etc.

3. **Agent Orchestrator** (`src/services/agentOrchestrator.ts`)
   - Main agentic workflow using OpenRouter function calling
   - Manages conversation history
   - Executes tools based on AI decisions
   - Returns structured responses

4. **Visualization Manager** (`src/hooks/useAgentVisualization.ts`)
   - Triggers pathfinding animations
   - Creates visual tasks in the database

5. **Agent Chat Component** (`src/components/AgentChat.tsx`)
   - User interface for the agent
   - Displays messages, progress, tool calls
   - Shows visualization indicators

### Data Flow

```
User Input
    ↓
Agent Orchestrator (OpenRouter + Claude 3.5 Sonnet)
    ↓
Function Calling Decision
    ↓
1. Context Gathering (if needed)
   - get_room_context
   - get_patient_context
   - etc.
    ↓
2. Action Execution (if needed)
   - check_in_patient
   - create_task
   - etc.
    ↓
3. Visualization Trigger (if applicable)
   - Creates task in database
   - Real-time subscription picks it up
   - 3D map shows animated path
    ↓
4. Response Generation
   - AI synthesizes results
   - Returns user-friendly message
    ↓
User sees: Response + Progress + Visualization
```

### Tools Available to the Agent

1. **get_room_context** - Get all info about a specific room
2. **get_patient_context** - Get all info about a patient
3. **get_equipment_context** - Get info about equipment
4. **get_hospital_context** - Get overall hospital status
5. **check_in_patient** - Admit a new patient
6. **discharge_patient** - Discharge a patient
7. **transfer_patient** - Move patient between rooms
8. **create_task** - Create various tasks (food, cleaning, etc.)
9. **update_vitals** - Update patient vital signs
10. **assign_staff** - Assign doctor/nurse to patient
11. **get_available_staff** - List available staff members
12. **create_alert** - Create room alert
13. **find_available_room** - Find available rooms

## Example Workflows

### 1. Patient Check-In Workflow

```
User: "Check in a new patient"

Agent Response:
"I'll help you check in a new patient. I need some information:
- Patient's name?
- Age?
- Gender?
- Medical condition?
- Severity? (stable/moderate/critical)"

[User provides information]

Agent Actions:
1. Executes: check_in_patient()
   - Creates patient record
   - Finds available room
   - Creates room assignment
   - Sets up initial vitals
2. Triggers: patient_onboarding visualization
   - Shows animated path to the assigned room on 3D map
3. Confirms: "Successfully checked in [Name] to room [Number]"
```

### 2. Room Status Query Workflow

```
User: "What's happening in room 102?"

Agent Actions:
1. Executes: get_room_context(102)
   - Queries room details
   - Gets patient assignment
   - Gets current vitals
   - Gets equipment list
   - Gets active tasks
   - Gets alerts
   - Gets assigned staff
2. Response:
   "Room 102 Status:
   - Patient: John Doe, 52M, Pneumonia (Moderate)
   - Vitals: HR 85, BP 130/85, Temp 99.2°F, O2 98%
   - Equipment: Bed, IV Pump, Monitor
   - Active Tasks: Food delivery (in progress)
   - Assigned: Dr. Smith, Nurse Johnson
   - Alerts: None"
```

### 3. Task Creation with Visualization Workflow

```
User: "Send bedsheets to room 101"

Agent Actions:
1. Executes: create_task()
   - Task type: linen_restocking
   - Target: room 101
   - Priority: medium
   - Creates task in database
2. Triggers: Visualization
   - Shows green dotted animated path on 3D map
   - From supply storage → room 101
   - Progress indicator moves along path
3. Confirms: "Successfully created linen restocking task for room 101.
   You can see the delivery path on the 3D map."
```

## Configuration

### Environment Variables

Ensure these are set in your `.env` file:

```env
VITE_OPENROUTER_API_KEY=sk-or-v1-your-key-here
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### OpenRouter Model

The agent uses **Claude 3.5 Sonnet** (`anthropic/claude-3.5-sonnet`) for:
- Function calling capabilities
- Natural language understanding
- Context-aware decision making

## Tips for Best Results

1. **Be specific:** "Send bedsheets to room 101" vs "Send something to a room"
2. **Provide context:** The agent will ask for missing information if needed
3. **Use natural language:** No need for commands, just ask naturally
4. **Check the 3D map:** Visualizations appear automatically for relevant actions
5. **Review tool calls:** The agent shows which tools it executed for transparency

## Troubleshooting

### Agent not responding
- Check OpenRouter API key in `.env`
- Check browser console for errors
- Ensure internet connection

### Visualizations not appearing
- Check that Supabase connection is active
- Verify tasks table has real-time subscriptions enabled
- Check TaskSubscription hook is working

### Actions failing
- Check Supabase permissions
- Verify database schema matches expected structure
- Check browser console for database errors

## Technical Details

### Function Calling

The agent uses OpenRouter's function calling feature with Claude 3.5 Sonnet:

```typescript
{
  model: 'anthropic/claude-3.5-sonnet',
  messages: [...],
  tools: [
    {
      type: 'function',
      function: {
        name: 'get_room_context',
        description: 'Get comprehensive information about a specific room...',
        parameters: { ... }
      }
    },
    // ... other tools
  ],
  tool_choice: 'auto'
}
```

### Iterative Tool Execution

The agent can make multiple tool calls in sequence:

1. First call: Gather context
2. Second call: Execute action based on context
3. Third call: Trigger visualization
4. Final: Generate response

This allows for complex workflows like:
```
get_room_context → check availability → transfer_patient → trigger visualization
```

### Real-time Visualization

Visualizations work via Supabase real-time subscriptions:

1. Agent creates task in `tasks` table
2. `useTaskSubscription` hook detects the insert
3. `TaskPathAnimation` component renders on 3D map
4. Animated dotted line shows path
5. Progress updates automatically

## Future Enhancements

Potential improvements:

- [ ] Voice input/output
- [ ] Multi-step workflow planning
- [ ] Predictive task suggestions
- [ ] Integration with IoT sensors
- [ ] Advanced analytics and reporting
- [ ] Customizable agent personas
- [ ] Batch operations
- [ ] Scheduled tasks

## Support

For issues or questions:
1. Check browser console for errors
2. Review this documentation
3. Check OpenRouter API status
4. Verify Supabase connectivity

---

**Built with:** React, TypeScript, OpenRouter, Claude 3.5 Sonnet, Supabase, Three.js
