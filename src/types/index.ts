export type ObjectType = 'background' | 'prop' | 'tile';
export type EditorTool = 'select' | 'place' | 'pan';
export type NumberVariant = '1x' | '@2x';

export interface PaletteObject {
  id: string;
  name: string;
  type: ObjectType;
  imageSrc: string;
  width: number;
  height: number;
  assignedNumber?: number;
  numberVariant?: NumberVariant;
  numberOffsetX?: number;
  numberOffsetY?: number;
  numberScale?: number;
  enableSvgOutline?: boolean;
  svgOutline?: string;
}

export interface MapObject {
  id: string; // uuid for map instance
  paletteObjectId: string; // reference to palette
  // Intrinsic properties mapped from palette object for independent json export
  name: string;
  type: ObjectType;
  imageSrc: string;
  width: number;
  height: number;
  assignedNumber?: number;
  numberVariant?: NumberVariant;
  numberOffsetX?: number;
  numberOffsetY?: number;
  numberScale?: number;
  enableSvgOutline?: boolean;
  svgOutline?: string;
  
  // Placement properties
  x: number;
  y: number;
  zIndex: number;
}
