import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RosterLab } from "./RosterLab";

const meta = {
  title: "Draft/V0.6 Roster Lab",
  component: RosterLab,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof RosterLab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ScoutingAndLineConstruction: Story = {};
