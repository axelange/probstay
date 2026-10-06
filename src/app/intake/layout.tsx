/**
 * The livery for the one page a client reaches.
 *
 * Everything visual here is carried by `data-brand`, which globals.css hangs
 * the agency's tokens off. Setting it on a layout rather than on the page puts
 * it above the scroll container, so the ink runs the full height of a short
 * form as well as a long one — on the page itself the ground stopped where the
 * content did and left the browser's white below it.
 *
 * The application is untouched by this: nothing else in the tree sets the
 * attribute, and the tokens are unreachable without it.
 */
export default function IntakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-brand="bstay"
      className="bg-background text-foreground min-h-dvh"
    >
      {children}
    </div>
  );
}
