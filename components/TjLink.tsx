import NextLink, { type LinkProps } from "next/link";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

export type TjLinkProps = LinkProps &
  ComponentPropsWithoutRef<"a"> & {
    /** Default false: evita storm di prefetch RSC verso pagine articolo su Vercel. */
    prefetch?: boolean;
  };

const TjLink = forwardRef<HTMLAnchorElement, TjLinkProps>(function TjLink(
  { prefetch = false, ...props },
  ref
) {
  return <NextLink ref={ref} prefetch={prefetch} {...props} />;
});

export default TjLink;
