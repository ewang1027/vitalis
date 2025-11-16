# 3D Hospital Equipment Components Guide

This guide explains how to use, modify, and create new 3D equipment components for the hospital room visualization system.

## Table of Contents
- [Overview](#overview)
- [Component Structure](#component-structure)
- [Understanding Coordinates](#understanding-coordinates)
- [Geometry Parameters](#geometry-parameters)
- [How to Modify Existing Equipment](#how-to-modify-existing-equipment)
- [How to Add New Equipment](#how-to-add-new-equipment)
- [Material Properties](#material-properties)
- [Best Practices](#best-practices)

---

## Overview

The 3D equipment system uses **React Three Fiber** (a React wrapper for Three.js) to render realistic hospital equipment in room detail views. Each piece of equipment is a self-contained component with detailed geometry.

**Available Equipment:**
- `HospitalBed.tsx` - Hospital bed with rails, wheels, mattress
- `OxygenTank.tsx` - Oxygen tank with cart and wheels
- `IVPump.tsx` - IV pump with pole, bag, and controls
- `MedicalMonitor.tsx` - Medical monitor with articulating arm
- `Wheelchair.tsx` - Wheelchair with wheels and frame

---

## Component Structure

Each equipment component follows this pattern:

```typescript
interface EquipmentProps {
  position: [number, number, number];  // [x, y, z] coordinates
  onClick?: () => void;                 // Click handler
  hovered?: boolean;                    // Hover state
}

export function Equipment({ position, onClick, hovered }: EquipmentProps) {
  return (
    <group position={position} onClick={onClick}>
      {/* All 3D meshes go here */}
    </group>
  );
}
```

---

## Understanding Coordinates

The 3D coordinate system works as follows:

### Coordinate System
- **X-axis**: Left (-) to Right (+)
- **Y-axis**: Down (-) to Up (+)  ê **Ground level is Y = 0**
- **Z-axis**: Back (-) to Front (+)

### Position Format
`position={[x, y, z]}`

**Examples:**
```typescript
position={[0, 0, 0]}      // Center of room, on floor
position={[2, 1, -3]}     // 2 units right, 1 unit up, 3 units back
position={[-1, 0.5, 1]}   // 1 unit left, 0.5 units up, 1 unit forward
```

### Important: Floor Level
**All equipment must touch the floor at Y = 0.** When positioning wheels or bases:
- For wheels/spheres: Y position = radius
- For boxes: Y position = height / 2
- For cylinders: Y position = height / 2

**Example:**
```typescript
// Wheel with radius 0.06
<mesh position={[0, 0.06, 0]}>  // Y = radius so bottom touches floor
  <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
</mesh>
```

---

## Geometry Parameters

### boxGeometry
Creates rectangular boxes.

**Format:** `<boxGeometry args={[width, height, depth]} />`
- **width** (X-axis): Left-right dimension
- **height** (Y-axis): Up-down dimension
- **depth** (Z-axis): Front-back dimension

**Example:**
```typescript
// Mattress: 1.9 wide, 0.3 tall, 1.7 deep
<boxGeometry args={[1.9, 0.3, 1.7]} />
```

### cylinderGeometry
Creates cylinders (wheels, poles, tanks).

**Format:** `<cylinderGeometry args={[radiusTop, radiusBottom, height, segments]} />`
- **radiusTop**: Radius at top
- **radiusBottom**: Radius at bottom
- **height**: Length of cylinder
- **segments**: Number of sides (higher = smoother, 8-24 typical)

**Example:**
```typescript
// Wheel: radius 0.06, height 0.04, 12 segments
<cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />

// Tapered pole: top 0.015, bottom 0.02, height 2
<cylinderGeometry args={[0.015, 0.02, 2, 12]} />
```

**Note:** Cylinders are vertical by default. Rotate for horizontal wheels:
```typescript
<mesh rotation={[0, 0, Math.PI / 2]}>  // Rotate 90∞ to make horizontal
  <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
</mesh>
```

### sphereGeometry
Creates spheres (status indicators, joints).

**Format:** `<sphereGeometry args={[radius, widthSegments, heightSegments]} />`

**Example:**
```typescript
// Status indicator sphere
<sphereGeometry args={[0.08, 16, 16]} />
```

### torusGeometry
Creates rings/donuts (wheel rims, handles).

**Format:** `<torusGeometry args={[radius, tubeRadius, radialSegments, tubularSegments]} />`

**Example:**
```typescript
// Wheel rim
<torusGeometry args={[0.25, 0.015, 12, 24]} />
```

### planeGeometry
Creates flat surfaces (floors, walls in room).

**Format:** `<planeGeometry args={[width, height]} />`

---

## How to Modify Existing Equipment

### Making the Bed Longer

1. **Find the bed frame** (line ~20 in HospitalBed.tsx):
```typescript
<boxGeometry args={[2, 0.1, 1.8]} />
```
The **third number (1.8)** is the length. Increase it:
```typescript
<boxGeometry args={[2, 0.1, 2.2]} />  // Now 2.2 units long
```

2. **Update mattress, sheets, rails** to match:
```typescript
// Mattress
<boxGeometry args={[1.9, 0.3, 2.1]} />  // Length: 2.2 - 0.1 = 2.1

// Sheet
<boxGeometry args={[1.85, 0.05, 2.05]} />  // Length: 2.1 - 0.05 = 2.05

// Side rails
<boxGeometry args={[0.04, 0.4, 2.1]} />
```

3. **Reposition headboard/footboard**:
```typescript
// Headboard (was at -0.9)
<mesh position={[0, 0.7, -1.1]} castShadow>  // New length/2 = 2.2/2 = 1.1

// Footboard (was at 0.9)
<mesh position={[0, 0.4, 1.1]} castShadow>
```

4. **Reposition wheels**:
```typescript
{[
  [-0.9, 0.06, -1.05],  // Near headboard (1.1 - 0.05 margin)
  [0.9, 0.06, -1.05],
  [-0.9, 0.06, 1.05],   // Near footboard
  [0.9, 0.06, 1.05],
]}
```

### Changing Equipment Colors

Find the color definitions at the top of each component:

```typescript
// In HospitalBed.tsx
const bedColor = hovered ? '#4a90e2' : '#3b82f6';  // Hover : Normal
const frameColor = '#8a8a8a';
const mattressColor = '#f5f5f5';
```

**Color format:** Hex colors (`#RRGGBB`)
- `#ff0000` = Red
- `#00ff00` = Green
- `#0000ff` = Blue
- `#ffffff` = White
- `#000000` = Black

### Making Equipment Taller/Shorter

**For IV Pump pole:**
```typescript
// Main pole (line ~39 in IVPump.tsx)
<mesh position={[0, 1.0, 0]} castShadow>
  <cylinderGeometry args={[0.015, 0.02, 2, 12]} />
  //                                    ^ This is height (currently 2)
</mesh>
```

To make it taller, increase the height AND adjust the Y position:
- Height 2 í position Y = 1.0 (half of height)
- Height 3 í position Y = 1.5 (new height / 2)

```typescript
<mesh position={[0, 1.5, 0]} castShadow>
  <cylinderGeometry args={[0.015, 0.02, 3, 12]} />
</mesh>
```

Don't forget to adjust items attached to the pole (hook, controls, etc.).

---

## How to Add New Equipment

### Step 1: Create New Component File

Create `/src/components/3d/NewEquipment.tsx`:

```typescript
import React from 'react';

interface NewEquipmentProps {
  position: [number, number, number];
  onClick?: () => void;
  hovered?: boolean;
}

export function NewEquipment({ position, onClick, hovered }: NewEquipmentProps) {
  const equipmentColor = hovered ? '#60a5fa' : '#3b82f6';

  return (
    <group position={position} onClick={onClick}>
      {/* Base - example: a box on the floor */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial
          color={equipmentColor}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>

      {/* Add more geometry here */}

      {/* Glow effect when hovered */}
      {hovered && (
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial
            color={equipmentColor}
            transparent
            opacity={0.2}
            emissive={equipmentColor}
            emissiveIntensity={0.4}
          />
        </mesh>
      )}
    </group>
  );
}
```

### Step 2: Export from Index

Add to `/src/components/3d/index.ts`:

```typescript
export { NewEquipment } from './NewEquipment';
```

### Step 3: Import in RoomDetailView

In `/src/components/RoomDetailView.tsx`, add the import:

```typescript
import { NewEquipment } from '@/components/3d/NewEquipment';
```

### Step 4: Add to Equipment Switch

In the `renderEquipmentModel()` function:

```typescript
switch (equipmentType) {
  case 'bed':
    return <HospitalBed position={position} onClick={handleClick} hovered={hovered} />;
  // ... other cases ...
  case 'new_equipment':  // Database equipment_type value
    return <NewEquipment position={position} onClick={handleClick} hovered={hovered} />;
  default:
    // ...
}
```

### Step 5: Add to Database

Insert equipment into database with `equipment_type = 'new_equipment'`:

```sql
INSERT INTO equipment (name, equipment_type, current_room_id, state, position_x, position_y, position_z)
VALUES ('New Item', 'new_equipment', 'room-id', 'idle_ready', 2, 0, -2);
```

---

## Material Properties

Materials control how objects look (color, shininess, roughness).

### meshStandardMaterial

Most common material type with realistic lighting.

```typescript
<meshStandardMaterial
  color="#3b82f6"          // Base color (hex)
  metalness={0.7}          // 0-1: How metallic (0=plastic, 1=metal)
  roughness={0.3}          // 0-1: Surface roughness (0=mirror, 1=matte)
  emissive="#000000"       // Glow color (usually black for no glow)
  emissiveIntensity={0.2}  // Glow strength (0-1)
  transparent={false}      // Enable transparency
  opacity={1}              // 0-1: Opacity (requires transparent=true)
/>
```

**Material Types by Object:**

| Object Type | Metalness | Roughness | Example |
|-------------|-----------|-----------|---------|
| Plastic/Fabric | 0.1-0.4 | 0.6-0.9 | Bed sheets, wheelchair seat |
| Metal Frame | 0.6-0.7 | 0.3-0.5 | Bed rails, wheelchair frame |
| Polished Metal | 0.8-0.9 | 0.1-0.3 | Oxygen tank, IV pole |
| Glass/Screen | 0.3-0.5 | 0.1-0.2 | Monitor screen, gauge glass |
| Rubber/Wheels | 0.1-0.2 | 0.7-0.8 | Wheelchair tires |

### meshBasicMaterial

Simple material, not affected by lighting (used for status indicators).

```typescript
<meshBasicMaterial color="#22c55e" />  // Always bright green
```

---

## Best Practices

### 1. Keep Equipment Centered at Origin

Build equipment around `position={[0, 0, 0]}` within the component, then position the entire `<group>` via props:

```typescript
//  Good
<group position={position}>  {/* Position from props */}
  <mesh position={[0, 0.5, 0]}>  {/* Relative to group */}
    ...
  </mesh>
</group>

// L Bad
<group position={[5, 0, 3]}>  {/* Hardcoded position */}
  ...
</group>
```

### 2. Use Descriptive Comments

Label each part clearly:

```typescript
{/* Main oxygen tank cylinder */}
<mesh position={[0, 1.15, 0]} castShadow>
  <cylinderGeometry args={[0.15, 0.15, 1.3, 24]} />
  ...
</mesh>

{/* Valve assembly on top */}
<group position={[0, 1.9, 0]}>
  ...
</group>
```

### 3. Enable Shadows

Add `castShadow` to objects that should cast shadows:

```typescript
<mesh castShadow>  {/* This object casts shadows */}
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color="#3b82f6" />
</mesh>
```

Add `receiveShadow` to surfaces that receive shadows (like floors).

### 4. Use Groups for Complex Assemblies

Group related parts together:

```typescript
{/* Wheel assembly */}
<group position={[0.9, 0.06, 0.85]}>
  {/* Wheel */}
  <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
    <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
    <meshStandardMaterial color="#333333" />
  </mesh>
  {/* Wheel mount */}
  <mesh position={[0, 0.08, 0]} castShadow>
    <cylinderGeometry args={[0.02, 0.02, 0.15, 8]} />
    <meshStandardMaterial color="#8a8a8a" />
  </mesh>
</group>
```

### 5. Optimize Geometry Segments

- **Low detail** (hidden parts): 6-8 segments
- **Medium detail** (visible parts): 12-16 segments
- **High detail** (featured parts): 24-32 segments

```typescript
// Hidden support pole - 8 segments
<cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />

// Visible wheel - 12 segments
<cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />

// Main oxygen tank - 24 segments (smooth and prominent)
<cylinderGeometry args={[0.15, 0.15, 1.3, 24]} />
```

### 6. Test Floor Positioning

After creating equipment, verify it touches the floor:

```typescript
// For a wheel with radius 0.06
position={[x, 0.06, z]}  // Y = radius

// For a box with height 0.5
position={[x, 0.25, z]}  // Y = height / 2

// For a cylinder (height 0.1) on the floor
position={[x, 0.05, z]}  // Y = height / 2
```

---

## Common Tasks Quick Reference

### Make bed longer
1. Increase frame Z value: `args={[2, 0.1, NEW_LENGTH]}`
2. Update mattress, sheet, rails Z values
3. Move headboard to `z: -NEW_LENGTH/2`
4. Move footboard to `z: NEW_LENGTH/2`
5. Reposition wheels near headboard/footboard

### Change equipment color
1. Find color constant at top: `const color = '#HEX_CODE'`
2. Update hex code
3. Check all `<meshStandardMaterial color={...} />` references

### Make pole taller
1. Find cylinder: `<cylinderGeometry args={[r1, r2, HEIGHT, seg]} />`
2. Increase HEIGHT
3. Update mesh Y position: `position={[x, HEIGHT/2, z]}`
4. Adjust attached components (hooks, controls, etc.)

### Add wheels to new equipment
1. Create wheel group at floor level
2. Set wheel Y position = wheel radius
3. Use `rotation={[0, 0, Math.PI / 2]}` for horizontal wheels
4. Position 4 wheels at corners of base

### Adjust equipment position in room
**Don't change component code!** Update database `position_x`, `position_y`, `position_z`:

```sql
UPDATE equipment
SET position_x = 2, position_y = 0, position_z = -3
WHERE id = 'equipment-id';
```

---

## Troubleshooting

### Equipment floating above floor
- Check Y position of base/wheels
- Y position should equal radius (for wheels/spheres) or height/2 (for boxes/cylinders)

### Equipment looks blocky
- Increase segment count in geometry
- Typical range: 12-24 segments

### Equipment too shiny/dull
- Adjust `metalness` (0-1)
- Adjust `roughness` (0-1)
- Polished metal: high metalness, low roughness
- Matte plastic: low metalness, high roughness

### Parts not aligned
- Check parent group position
- Verify child mesh positions are relative to parent
- Use browser dev tools to inspect position values

---

## Resources

- **React Three Fiber Docs**: https://docs.pmnd.rs/react-three-fiber
- **Three.js Geometries**: https://threejs.org/docs/#api/en/geometries/BoxGeometry
- **Three.js Materials**: https://threejs.org/docs/#api/en/materials/MeshStandardMaterial
- **Color Picker**: https://htmlcolorcodes.com/

---

## Example: Creating a Simple Table

```typescript
import React from 'react';

interface TableProps {
  position: [number, number, number];
  onClick?: () => void;
  hovered?: boolean;
}

export function Table({ position, onClick, hovered }: TableProps) {
  return (
    <group position={position} onClick={onClick}>
      {/* Table top */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[1.2, 0.05, 0.8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Table legs (4 corners) */}
      {[
        [-0.55, 0.375, -0.35],
        [0.55, 0.375, -0.35],
        [-0.55, 0.375, 0.35],
        [0.55, 0.375, 0.35],
      ].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.75, 8]} />
          <meshStandardMaterial color="#654321" roughness={0.7} metalness={0.2} />
        </mesh>
      ))}

      {/* Hover glow */}
      {hovered && (
        <mesh position={[0, 0.75, 0]}>
          <boxGeometry args={[1.3, 0.1, 0.9]} />
          <meshStandardMaterial
            color="#ffa500"
            transparent
            opacity={0.2}
            emissive="#ffa500"
            emissiveIntensity={0.3}
          />
        </mesh>
      )}
    </group>
  );
}
```

**Breakdown:**
- Table top: 1.2 wide ◊ 0.05 tall ◊ 0.8 deep, positioned at Y = 0.75 (top is at 0.75 + 0.025 = 0.775)
- 4 legs: radius 0.03, height 0.75, positioned at Y = 0.375 (bottom at 0, top at 0.75)
- Legs positioned at corners with 0.05 inset from edge
- Wood colors with low metalness, medium-high roughness
- Hover effect with orange glow

---

**Last Updated:** 2025-01-15
**Version:** 1.0
