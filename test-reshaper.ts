import ArabicReshaper from 'arabic-reshaper';
const text = "الإجمالي غير خاضع";
const reshaped = ArabicReshaper.convertArabic(text);
const reversed = reshaped.split('').reverse().join('');
console.log("Original:", text);
console.log("Reshaped:", reshaped);
console.log("Reversed:", reversed);
