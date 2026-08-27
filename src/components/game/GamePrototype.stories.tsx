import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { shotReadyScenario } from "@/src/game/testing/scenarios";
import { GamePrototype } from "./GamePrototype";

const meta = {
  title: "Draft/Game Prototype",
  component: GamePrototype,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof GamePrototype>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TacticalOpening: Story = {};

export const LiveShotReady: Story = {
  args: {
    initialMode: "live",
    initialState: shotReadyScenario(),
  },
};
