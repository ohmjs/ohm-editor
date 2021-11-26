function objectForEach(obj, func) {
  Object.keys(obj).forEach(key => {
    return func(key, obj[key], obj);
  });
}

module.exports = {
  objectForEach,
  objectMap(obj, func) {
    return Object.keys(obj).map(key => {
      return func(key, obj[key], obj);
    });
  },

  repeat(n, fn) {
    if (n < 0) {
      return;
    }
    while (n > 0) {
      fn();
      n--;
    }
  },

  shuffle(a) {
    let j;
    let x;
    let i;
    for (i = a.length; i; i -= 1) {
      j = Math.floor(Math.random() * i);
      x = a[i - 1];
      a[i - 1] = a[j];
      a[j] = x;
    }
  },

  // same as a\b
  difference(a, b) {
    return a.filter(item => {
      return b.indexOf(item) === -1;
    });
  },

  includes(array, item) {
    return array.indexOf(item) !== -1;
  },
};
