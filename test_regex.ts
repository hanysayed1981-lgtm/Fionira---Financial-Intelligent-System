const taxableRegex = /taxable|خاضع|قبل الضريب(ة|ه)/i;
const nonTaxRegex = /non taxable|zero rated|exempt|0%|غير خاضع|بدون ضريب(ة|ه)|صفر/i;

const headers = [
  "المبلغ الخاضع للضريبة",
  "غير خاضع",
  "بدون ضريبة",
  "اجمالي الفاتورة",
  "المبلغ",
  "اضافي",
  "خاضع للضريبة"
];

for(const h of headers) {
  console.log(h, "Taxable:", taxableRegex.test(h), "NonTaxable:", nonTaxRegex.test(h));
}
