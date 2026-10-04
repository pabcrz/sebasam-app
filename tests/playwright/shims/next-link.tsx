import * as React from "react";

const Link = React.forwardRef<HTMLAnchorElement, React.ComponentProps<"a">>(
  ({ href = "#", ...props }, ref) => <a ref={ref} href={href} {...props} />,
);

Link.displayName = "FixtureNextLink";

export default Link;
