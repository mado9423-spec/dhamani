insert into branches (code, name) values
  ('benghazi', 'بنغازي'),
  ('tripoli', 'طرابلس'),
  ('albayda', 'البيضاء'),
  ('misrata', 'مصراتة'),
  ('sabha', 'سبها'),
  ('derna', 'درنة'),
  ('tobruk', 'طبرق'),
  ('zawiya', 'الزاوية');

insert into transaction_types (code, name_ar, description) values
  ('new_pension', 'معاش جديد', 'طلب صرف معاش جديد'),
  ('modification', 'تعديل', 'تعديل بيانات معاش قائم'),
  ('release', 'إفراج', 'إفراج عن معاملة موقوفة'),
  ('death_grant', 'منحة وفاة', 'صرف منحة وفاة لذوي المتوفى'),
  ('advance', 'سلفة', 'طلب صرف سلفة'),
  ('cancellation', 'إلغاء', 'إلغاء معاملة أو معاش'),
  ('suspension', 'إيقاف', 'إيقاف صرف معاش مؤقتاً');
