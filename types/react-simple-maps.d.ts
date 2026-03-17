declare module "react-simple-maps" {
  import type { ComponentType } from "react";

  export const ComposableMap: ComponentType<{
    projection?: string;
    projectionConfig?: { scale?: number };
    className?: string;
    children?: React.ReactNode;
  }>;

  export const Geographies: ComponentType<{
    geography: string;
    children: (props: {
      geographies: Array<{
        rsmKey: string;
        id?: string;
        [key: string]: unknown;
      }>;
    }) => React.ReactNode;
  }>;

  export const Geography: ComponentType<{
    geography: { rsmKey: string; id?: string; [key: string]: unknown };
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?: React.CSSProperties;
  }>;
}
