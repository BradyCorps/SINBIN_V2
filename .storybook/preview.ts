import type { Preview } from "@storybook/nextjs-vite";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "SINBIN navy",
      values: [{ name: "SINBIN navy", value: "#06151e" }],
    },
    viewport: {
      options: {
        sinbinCompact: {
          name: "SINBIN Compact 667×375",
          styles: { width: "667px", height: "375px" },
          type: "mobile",
        },
        sinbinReference: {
          name: "SINBIN Reference 844×390",
          styles: { width: "844px", height: "390px" },
          type: "mobile",
        },
        sinbinLarge: {
          name: "SINBIN Large 915×412",
          styles: { width: "915px", height: "412px" },
          type: "mobile",
        },
      },
    },
  },
};

export default preview;
