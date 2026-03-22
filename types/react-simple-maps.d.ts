declare module "react-simple-maps" {
  import type { ReactNode, CSSProperties } from "react";

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: Record<string, unknown>;
    width?: number;
    height?: number;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
  }
  export const ComposableMap: (props: ComposableMapProps) => JSX.Element;

  export interface GeographyObject {
    id?: string;
    rsmKey?: string;
    properties?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface GeographiesProps {
    geography: string;
    children: (args: { geographies: GeographyObject[] }) => ReactNode;
  }
  export const Geographies: (props: GeographiesProps) => JSX.Element;

  export interface GeographyProps {
    geography: unknown;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    style?:
      | CSSProperties
      | {
          default?: CSSProperties;
          hover?: CSSProperties;
          pressed?: CSSProperties;
        };
    [key: string]: unknown;
  }
  export const Geography: (props: GeographyProps) => JSX.Element;
}
