# Potentially Unused Dependencies

The following npm packages are installed but don't appear to be imported anywhere in the codebase. Review and consider removing them with `npm uninstall <package-name>`.

## Likely Unused (Safe to Remove)

| Package | Reason |
|---------|--------|
| `@radix-ui/react-hover-card` | Not imported in any file |
| `html-react-parser` | Not imported in any file |
| `motion` | Not imported in any file |
| `next-themes` | Not imported - custom ThemeProvider is used instead |
| `qss` | Not imported in any file |
| `react-tsparticles` | Not imported in any file |
| `tsparticles-slim` | Not imported in any file |
| `clsx` | Not imported in any file |
| `tailwind-merge` | Not imported in any file |

## Command to Remove All

```bash
npm uninstall @radix-ui/react-hover-card html-react-parser motion next-themes qss react-tsparticles tsparticles-slim clsx tailwind-merge
```

## Files Removed During Cleanup

The following files were removed as they were not imported/used:

- `app/components/ui/ImageTooltip.tsx`
- `app/utils/animation.ts`
- `app/utils/logger.js`
- `app/api/` (empty directory)
- `public/file.svg`
- `public/globe.svg`
- `public/next.svg`
- `public/window.svg`
- `public/sdx.webp`
- `public/yc-x25.webp`

## Import Cleanups

Unused imports were removed from:

- `app/page.tsx` - Removed `Suspense`, `ReactNode`, and commented `Image` import
- `app/components/ui/Tooltip.tsx` - Removed `useEffect`

