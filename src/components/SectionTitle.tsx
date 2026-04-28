export function SectionTitle({
  title,
  id,
  align = "left"
}: {
  title: string;
  id?: string;
  align?: "left" | "center";
}) {
  return (
    <h2
      id={id}
      className={[
        "font-serif text-[2rem] leading-none text-burgundy md:text-[2.5rem]",
        align === "center" ? "text-center" : "text-left"
      ].join(" ")}
    >
      {title}
    </h2>
  );
}
