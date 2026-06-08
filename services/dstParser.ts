
/**
 * Simple client-side parser for Tajima (.DST) embroidery files.
 * Reads the 512-byte header to extract metadata.
 */

export interface DstMetadata {
  label: string;
  stitches: number;
  colors: number;
  widthMm: number;
  heightMm: number;
}

export const parseDstFile = async (file: File): Promise<DstMetadata> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer || buffer.byteLength < 512) {
          throw new Error("Invalid DST file: Header too short");
        }

        // The DST header is ASCII text in the first 512 bytes
        const headerView = new Uint8Array(buffer, 0, 512);
        const header = new TextDecoder().decode(headerView);

        // Parse fields using regex based on Tajima spec
        // LA: Label
        // ST: Stitch count
        // CO: Color changes (actually stop codes, so colors = changes + 1 usually)
        // +X, -X, +Y, -Y: Extents in 0.1mm units

        const getVal = (key: string): number => {
          const match = header.match(new RegExp(`${key}:\\s*(\\d+)`));
          return match ? parseInt(match[1], 10) : 0;
        };

        const labelMatch = header.match(/LA:([^\r\n]+)/);
        const label = labelMatch ? labelMatch[1].trim() : file.name;

        const stitches = getVal('ST');
        // CO in DST is color changes. Number of colors is usually changes + 1 (assuming start is color 1)
        // However, standard practice is to treat CO value as the number of stops.
        const colorChanges = getVal('CO');
        const colors = colorChanges + 1; 

        // Extents (Dimensions)
        // Units are 0.1mm
        const posX = getVal('\\+X');
        const negX = getVal('-X');
        const posY = getVal('\\+Y');
        const negY = getVal('-Y');

        // Calculate total width/height in MM
        const widthMm = (posX + negX) / 10;
        const heightMm = (posY + negY) / 10;

        resolve({
          label,
          stitches,
          colors,
          widthMm,
          heightMm
        });

      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
};
