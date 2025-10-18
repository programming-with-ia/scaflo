export function getDeepValue<T>(obj: any, key: string): T | undefined {
  const keys = key.split('.');

  const value = keys.reduce((acc, currentKey) => {
    // Check if the accumulator is a valid object before proceeding
    return acc && typeof acc === 'object' ? acc[currentKey] : undefined;
  }, obj);

  return value as T | undefined;
}

export function setDeepValue(obj: any, key: string, value: any): void {
  const keys = key.split('.');
  
  // The last key is the property we want to set
  const lastKey = keys.pop();
  
  // If the key is empty or invalid, we can't proceed
  if (!lastKey) {
    console.error("Invalid key provided.");
    return;
  }

  // Reduce to the second-to-last object in the path, creating new objects as needed
  const targetObject = keys.reduce((acc, currentKey) => {
    if (!acc[currentKey] || typeof acc[currentKey] !== 'object') {
      // If the path doesn't exist or is not an object, create it
      acc[currentKey] = {};
    }
    return acc[currentKey];
  }, obj);

  // Set the final value on the now-guaranteed-to-exist target object
  targetObject[lastKey] = value;
}


// const good = {}
// setDeepValue(good, "user-name", "ali")
// console.log(getDeepValue(good, "user-name"))
