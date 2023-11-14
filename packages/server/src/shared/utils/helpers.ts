export const cleanTagsForSending = (obj) => {
  for (const propName in obj) {
    if (obj.hasOwnProperty(propName)) {
      const propValue = obj[propName];
      if (typeof propValue === 'string' || typeof propValue === 'number') {
        if (
          propValue === '' ||
          (typeof propValue === 'number' && isNaN(propValue))
        ) {
          delete obj[propName];
        }
      } else if (Array.isArray(propValue)) {
        const arr = propValue.filter((element) => typeof element === 'string');
        if (arr.length === 0) {
          delete obj[propName];
        } else {
          obj[propName] = arr;
        }
      } else {
        delete obj[propName];
      }
    }
  }
  return obj;
};

export const stripPhoneNumber = (phoneNumber: string): string => {
  phoneNumber = phoneNumber?.trim();

  if (!phoneNumber) {
    return phoneNumber;
  }

  if (!phoneNumber || phoneNumber.startsWith('+')) {
    return phoneNumber;
  }

  // NOTE: Assune this is for Malaysian number if start with 0
  if (phoneNumber[0] === '0') {
    phoneNumber = '+6' + phoneNumber;
  }

  if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+' + phoneNumber;
  }

  return phoneNumber;
};
