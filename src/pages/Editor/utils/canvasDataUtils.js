export function processProfileData(mlmForm, mlmProfile) {
  const profileName = mlmForm?.promoter?.name
    ? mlmForm.promoter.name
    : mlmProfile?.fullName || "";

  const profileMobile = mlmForm?.promoter?.name
    ? mlmForm.promoter.mobile
    : mlmProfile?.mobile || "";

  const designation = mlmForm?.promoter?.name
    ? mlmForm.promoter.role
    : mlmProfile?.designation || "";

  const socialURLs = mlmProfile?.socials || {};
  const socialText =
    socialURLs.Youtube ||
    socialURLs.Instagram ||
    socialURLs.Facebook ||
    socialURLs.X ||
    "";

  const availableSocials = [
    socialURLs.Youtube ? "youtube" : null,
    socialURLs.Instagram ? "instagram" : null,
    socialURLs.Facebook ? "facebook" : null,
    socialURLs.X ? "x" : null,
  ].filter(Boolean);

  return {
    profileName: profileName?.toUpperCase() || "PROFILENAME",
    profileMobile,
    designation: designation?.toUpperCase() || "DESIGNATION",
    socialURLs,
    socialText,
    availableSocials,
  };
}

export function getAchieverDisplayName(achiever) {
  if (!achiever) return "";

  const rawTitle = String(achiever.title || "").trim().toLowerCase().replace(/\./g, "");
  const title =
    rawTitle === "mrs"
      ? "Mrs."
      : rawTitle === "dr"
        ? "Dr."
        : rawTitle === "ms"
          ? "Ms."
          : rawTitle === "miss"
            ? "Miss"
            : "Mr.";
  const name = String(achiever.name || "").trim();
  const legacyCombinedName = String(achiever.achieverName || "").trim();

  if (name) {
    // Avoid "Mr. Mr. Rahul" when older saved data already kept the title in
    // the name field, while ensuring newly selected titles always reach editor.
    if (/^(?:Mr|Mrs|Ms|Miss|Dr)\.?(?:\s+|$)/i.test(name)) return name;
    return `${title} ${name}`.trim();
  }

  if (!legacyCombinedName) return "";
  if (/^(?:Mr|Mrs|Ms|Miss|Dr)\.?(?:\s+|$)/i.test(legacyCombinedName)) {
    return legacyCombinedName;
  }
  return `${title || "Mr."} ${legacyCombinedName}`.trim();
}

export function processFormData(mlmForm) {
  return {
    formName: getAchieverDisplayName(mlmForm?.achiever),
    formCity: mlmForm?.achiever?.city || "",
    formAmount: mlmForm?.achiever?.amount || "",
  };
}

export function calculateFontSizes(profileName, designation) {
  let profileFontSize = 10;
  if (profileName?.length > 10 && profileName?.length <= 19) {
    profileFontSize = 7;
  } else if (profileName?.length > 19) {
    profileFontSize = 6;
  }

  let designationFontSize = 8;
  if (designation?.length > 10 && designation?.length <= 19) {
    designationFontSize = 6;
  } else if (designation?.length > 19) {
    designationFontSize = 5;
  }

  return {
    profileFontSize,
    designationFontSize,
  };
}
