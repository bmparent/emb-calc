import { ApparelType } from './types';

// Job-level operations (seconds)
export const LOAD_DST_TIME = 120;
export const INPUT_DST_TIME = 110;

// Per-piece operations (seconds)
export const MARK_SHIRT_TIME = 15;
export const HOOP_SHIRT_TIME = 25;
export const HOOP_HAT_TIME = 40;
export const REMOVE_HOOP_TIME = 15;
export const FOLD_STEAM_TIME = 22;
export const PACK_TIME = 10;

// Per-design operations (seconds)
export const COLOR_CHANGE_TIME = 5;

// Buffers & modifiers
export const MACHINE_EFFICIENCY = 0.85; // 85% effective RPM
export const THREAD_BREAK_TIME = 15; // seconds lost per 1,000 stitches
export const OTHER_ISSUES_BUFFER = 0.33; // +33% contingency

// Garments requiring marking
export const GARMENT_TYPES_REQUIRING_MARK = new Set([
  ApparelType.Tshirt,
  ApparelType.Polo,
  ApparelType.Bag,
  ApparelType.Promo,
]);

// Madeira Backing Options
export const MADEIRA_BACKING_OPTIONS = [
  "None / Direct",
  "E-Zee Tear 1.5oz (Soft Tearaway)",
  "E-Zee Tear 2.0oz (Heavy Tearaway)",
  "E-Zee Cut 2.0oz (Standard Cutaway)",
  "E-Zee Cut 3.0oz (Heavy Cutaway)",
  "E-Zee Weblon PolyMesh (No-Show - Performance)",
  "E-Zee Performance Cutaway 1.5oz (Light/Stretchy)",
  "E-Zee Performance Tearaway 1.5oz (Activewear)",
  "E-Zee ActionBack (Athletic Uniforms)",
  "E-Zee Comfort Wear (Soft Skin-Contact Lining)",
  "E-Zee Cap Backing (Heavy Duty)",
  "E-Zee Stick-On (Self-Adhesive - Hard to Hoop)",
  "E-Zee Water Soluble (Solvy - Topping)",
  "E-Zee Water Soluble (Heavyweight Base)",
  "E-Zee Heat-Away (Delicate Fabrics)",
  "Fire Retardant Backing",
  "E-Zee Puff Backing (3D Foam Support)",
  "E-Zee Underlay Special (Stability for Loose Knits)"
];

// Madeira Polyneon Inventory (From User CSV)
export const MADEIRA_THREAD_INVENTORY = {
  "Blacks": ["918-1800 (#40)", "924-1800 (#60)", "936-1800 (#75)"],
  "Whites": ["918-1801 (#40)", "924-1801 (#60)", "936-1801 (#75)"],
  "Reds": ["1637", "1982", "1374", "1385", "1635", "1037", "1038", "1236", "1838", "1839", "1147", "1146", "1747", "1981"],
  "Oranges": ["1987", "1621", "1065", "1955", "1755", "1946", "1026", "1765", "1078", "1678", "1965"],
  "Yellows": ["1064", "1924", "1727", "1123", "1623", "1172", "1083", "1124", "1683", "1024", "1980", "1069", "1693"],
  "Greens": ["1768", "1569", "1248", "1749", "1649", "1651", "1750", "1370", "1968", "1051", "1996", "1902", "1751", "1308", "1988"],
  "Blues": ["1029", "1042", "1642", "1671", "1675", "1776", "1829", "1874", "1295", "1895", "1846", "1593", "1611", "1132", "1177", "1296", "1297", "1828", "1842", "1967", "1944", "1695", "1373", "1966", "1076", "1893", "1094", "1095"],
  "Purples": ["1080", "1334", "1634", "1722", "1922", "1633", "1880", "1831", "1766"],
  "Pinks": ["1110", "1815", "1990", "1108"],
  "Golds": ["1255", "1771", "1624", "1971", "1670", "1255", "1672", "1173", "1352", "1225", "1070", "1270", "1683"],
  "Browns": ["1659", "1729", "1931", "1945", "1057", "1056", "1030", "1257", "1258", "1973"],
  "Greys & Silvers": ["1610", "1613", "1614", "1361", "1010", "1741", "1812", "1012", "1918", "1640", "1011", "1811", "1611"],
  "Fluorescent": ["1907 FL Pink", "1946 FL Orange", "1935 FL Yellow", "1950 FL Green", "1901 Green"],
  "Tans": ["1884", "1855", "1927"],
  "Light Tans": ["1682", "1938", "1661", "1666"]
};

export const MADEIRA_WEBSITE_URL = "https://www.madeirausa.com/";
