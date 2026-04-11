import { useState, useEffect } from "react";

const taglines = [
  "Empowering Futures",
  "Excellence in Education",
  "Your Journey Starts Here",
  "Where Knowledge Meets Innovation",
  "Building Tomorrow's Leaders",
];

export default function TypingTagline() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const tagline = taglines[currentIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayed.length < tagline.length) {
      timeout = setTimeout(() => setDisplayed(tagline.slice(0, displayed.length + 1)), 60);
    } else if (!isDeleting && displayed.length === tagline.length) {
      timeout = setTimeout(() => setIsDeleting(true), 2200);
    } else if (isDeleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
    } else {
      setIsDeleting(false);
      setCurrentIndex((prev) => (prev + 1) % taglines.length);
    }

    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, currentIndex]);

  return (
    <span className="font-body text-sm sm:text-lg text-primary-foreground/80 tracking-wide">
      {displayed}
      <span className="inline-block w-[2px] h-[1.1em] bg-secondary ml-0.5 align-middle animate-pulse" />
    </span>
  );
}
