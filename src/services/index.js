export const fetchDevices = async () => {
  const response = await fetch("/device.json");
  const data = await response.json();
  return data;
};

export const fetchFaults = async () => {
  const response = await fetch("/fault.json");
  const data = await response.json();
  return data;
};
