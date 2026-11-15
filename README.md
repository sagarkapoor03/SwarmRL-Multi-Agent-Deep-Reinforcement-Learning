# SwarmRL – Multi-Agent Deep Reinforcement Learning Simulator 🚁

## Overview

SwarmRL is a Multi-Agent Deep Reinforcement Learning project designed to simulate and visualize autonomous drone swarms for intelligent disaster-zone exploration and search-and-rescue operations.

The project focuses on coordinating multiple autonomous drones that work together to explore unknown environments, avoid collisions, distribute search tasks, and maximize overall exploration coverage.

The proposed system uses Multi-Agent Proximal Policy Optimization (MAPPO) to enable intelligent cooperation and decentralized decision-making among multiple agents.

SwarmRL also provides an interactive Mission Control Dashboard to monitor drone activities, simulation status, exploration progress, and performance metrics.

## Problem Statement

During natural disasters such as earthquakes, floods, and landslides, searching large affected areas is challenging and time-consuming.

A single drone may have limited exploration capabilities. SwarmRL aims to address this challenge through a cooperative multi-agent system where multiple autonomous drones coordinate their movements and search activities efficiently.

## Objectives

- Develop a cooperative autonomous drone swarm system.
- Enable intelligent decision-making among multiple agents.
- Improve disaster-zone exploration and search coverage.
- Minimize collisions between autonomous drones.
- Optimize exploration efficiency using reinforcement learning.
- Visualize swarm activities through a centralized dashboard.

## Key Features

- **Multi-Agent Reinforcement Learning:** Supports the concept of cooperative learning among multiple autonomous agents.
- **MAPPO Algorithm:** Uses MAPPO as the proposed approach for multi-agent coordination.
- **Autonomous Exploration:** Focuses on intelligent exploration of unknown environments.
- **Collision Avoidance:** Considers safe movement and collision reduction.
- **Mission Control Dashboard:** Provides a centralized interface for monitoring swarm activities.
- **Simulation Visualization:** Organizes simulation and environment-related information.
- **Performance Analytics:** Tracks exploration and simulation-related metrics.
- **Scalable Architecture:** Designed for future integration of additional agents and simulation capabilities.

## Technology Stack

### Frontend
- Next.js
- React.js
- TypeScript
- Tailwind CSS
- Three.js
- React Three Fiber
- Recharts
- Framer Motion
- Lucide React

### Planned Backend and AI Technologies
- Python
- PyTorch
- Ray RLlib
- PettingZoo
- MAPPO
- WebSockets

## System Architecture

The proposed system consists of the following major components:

1. **Simulation Environment:** Represents a disaster-affected area where autonomous drones perform exploration.
2. **Autonomous Agents:** Individual drones responsible for searching and exploring different regions.
3. **Reinforcement Learning Engine:** Uses a MAPPO-based approach for cooperative agent training.
4. **Reward Mechanism:** Encourages exploration and penalizes collisions.
5. **Communication Layer:** Supports information exchange between agents and the dashboard.
6. **Visualization Dashboard:** Displays drone activities, simulation status, and performance information.
7. **Analytics Module:** Evaluates exploration coverage, collisions, and coordination efficiency.

## How MAPPO Works

Multi-Agent Proximal Policy Optimization (MAPPO) is a reinforcement learning algorithm designed for multi-agent environments.

The basic workflow includes:

1. Each agent observes its surrounding environment.
2. Agents select actions according to their policies.
3. The environment updates agent positions and states.
4. A reward mechanism evaluates agent behavior.
5. The learning process improves agent policies through repeated training episodes.

The proposed reward mechanism encourages exploration, efficient coverage, and cooperation while penalizing collisions and unnecessary movement.

## Project Structure

The repository contains the following major frontend directories:

- `app/` – Application pages and routes.
- `components/` – Reusable dashboard and interface components.
- `hooks/` – Custom React hooks.
- `lib/` – Application utilities and simulation-related logic.
- `public/` – Static assets.

## Installation and Setup

### Prerequisites

- Node.js
- pnpm
- Visual Studio Code

### 1. Clone the Repository

```bash
git clone https://github.com/sagarkapoor03/SwarmRL-Multi-Agent-Deep-Reinforcement-Learning.git
```

### 2. Navigate to the Project Directory

```bash
cd "SwarmRL-Multi-Agent-Deep-Reinforcement-Learning/SwarmRL Project"
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Start the Development Server

```bash
pnpm dev
```

### 5. Open in Browser

Visit:

http://localhost:3000

### Production Build

```bash
pnpm build
pnpm start
```

## Performance Metrics

The proposed simulation focuses on the following evaluation metrics:

- **Map Coverage:** Percentage of the search area explored.
- **Active Agents:** Number of active autonomous drones.
- **Collision Count:** Total collisions between agents.
- **Exploration Efficiency:** Efficiency of search operations.
- **Episode Reward:** Total reward obtained during training.
- **Agent Coordination:** Effectiveness of cooperative decision-making.

## Applications

SwarmRL has potential applications in:

- Disaster management and rescue operations.
- Flood-affected area exploration.
- Earthquake-damaged building inspection.
- Forest monitoring and surveillance.
- Autonomous robotics.
- Multi-agent reinforcement learning research.

## Future Scope

- Implementation of a complete MAPPO training pipeline.
- Integration of a multi-agent simulation backend.
- Real-time communication between the backend and frontend.
- Dynamic obstacles and environmental conditions.
- Improved collision avoidance strategies.
- Support for larger autonomous drone swarms.
- Real-time drone-state visualization.
- Model evaluation and performance optimization.

## Project Status

**Currently Under Development**

The current repository contains the Next.js frontend application and dashboard-related structure. The complete reinforcement learning backend, MAPPO training pipeline, and live simulation integration are planned for future development.

## Author

**Sagar Kapoor**

GitHub: https://github.com/sagarkapoor03

---

**SwarmRL – Teaching Autonomous Drones to Think, Collaborate, and Explore.**
