import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { StageScaler } from "./StageScaler";

const meta = {
  title: "Foundation/StageScaler",
  component: StageScaler,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ width: "100vw", height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StageScaler>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReferenceStage: Story = {
  args: {
    children: (
      <div
        style={{
          width: 844,
          height: 390,
          display: "grid",
          placeItems: "center",
          background: "#0c2638",
          color: "#eee6d4",
        }}
      >
        844 × 390 logical stage
      </div>
    ),
  },
};
