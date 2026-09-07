import { ApparelType } from "../../types";
export function GarmentIcon({ type }: { type: ApparelType }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="32"
      height="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === ApparelType.Hat ? (
        <>
          <path d="M5 20v-5a10 10 0 0 1 20 0v5M5 20c6-2 15-2 23 2 2 2-3 5-9 3l-6-3-8-2Z" />
          <path d="M16 5c-3 4-4 8-4 14" />
        </>
      ) : type === ApparelType.Bag ? (
        <>
          <path d="M6 11h20l2 17H4l2-17Z" />
          <path d="M11 14V8a5 5 0 0 1 10 0v6" />
        </>
      ) : (
        <>
          <path d="m10 5-7 4 3 7 4-2v14h12V14l4 2 3-7-7-4" />
          {type === ApparelType.Polo ? (
            <>
              <path d="m10 5 6 5 6-5-3 9-3-4-3 4-3-9Z" />
              <path d="M16 10v9" />
            </>
          ) : (
            <path d="M10 5c0 7 12 7 12 0" />
          )}
        </>
      )}
    </svg>
  );
}
