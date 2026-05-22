"use client";

import { useCallback, useEffect, useId, useState, type RefObject } from "react";

export function useFieldAriaInvalid(
  inputRef: RefObject<HTMLInputElement | null>,
  externalInvalid?: boolean,
) {
  const errorId = useId();
  const [userInvalid, setUserInvalid] = useState(false);

  const syncInvalid = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    setUserInvalid(input.matches(":user-invalid"));
  }, [inputRef]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    syncInvalid();
    input.addEventListener("input", syncInvalid);
    input.addEventListener("blur", syncInvalid);
    input.addEventListener("invalid", syncInvalid);

    return () => {
      input.removeEventListener("input", syncInvalid);
      input.removeEventListener("blur", syncInvalid);
      input.removeEventListener("invalid", syncInvalid);
    };
  }, [inputRef, syncInvalid]);

  const invalid = Boolean(externalInvalid) || userInvalid;

  return { errorId, invalid };
}
