const STORAGE_KEY = "dukou:auth";

export function checkPassword(input) {
  const stored = localStorage.getItem(STORAGE_KEY);
  const password = stored || "1234567";
  return input === password;
}

export function changePassword(oldPwd, newPwd) {
  if (!checkPassword(oldPwd)) return false;
  localStorage.setItem(STORAGE_KEY, newPwd);
  return true;
}
