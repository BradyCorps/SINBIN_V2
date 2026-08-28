import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  counterattackScenario,
  exposedNetScenario,
  formationOpeningScenario,
} from "@/src/game/testing/scenarios";
import { GamePrototype } from "./GamePrototype";

const meta = {
  title: "Draft/Game Prototype",
  component: GamePrototype,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof GamePrototype>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SlotCollapse: Story = {
  args: { initialState: formationOpeningScenario("slot-collapse") },
};

export const WideDenial: Story = {
  args: { initialState: formationOpeningScenario("wide-denial") },
};

export const HighPress: Story = {
  args: { initialState: formationOpeningScenario("high-press") },
};

export const ExposedNet: Story = {
  args: {
    initialState: exposedNetScenario(),
  },
};

export const Counterattack: Story = {
  args: {
    initialState: counterattackScenario(),
  },
};
