import re

with open('d:/tutterfly/apps/frontend/src/features/leads/components/ConvertLeadDialog.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's just look at specific tags we care about
for tag_name in ['Dialog', 'DialogContent', 'Form', 'form', 'Card', 'CardContent', 'FormField', 'FormItem', 'FormControl', 'FormMessage']:
    # Count opening tags <Tag ... > (excluding self-closing)
    # We use DOTALL and search for tags that don't end with />
    # This is tricky with regex. Let's just find all <Tag and </Tag and <Tag ... />
    
    total_open = len(re.findall(f'<{tag_name}\\b', content))
    total_close = len(re.findall(f'</{tag_name}>', content))
    
    # Self-closing is harder but let's try to find <Tag ... /> multiline
    self_closing = len(re.findall(rf'<{tag_name}\b.*?\/>', content, re.DOTALL))
    
    print(f"{tag_name}: total_open={total_open}, total_close={total_close}, self_closing={self_closing}")

# Check div
open_div = len(re.findall(r'<div\b', content))
close_div = len(re.findall(r'</div>', content))
self_closing_div = len(re.findall(r'<div\b.*?\/>', content, re.DOTALL))
print(f"div: open={open_div}, close={close_div}, self_closing={self_closing_div}")

# Parentheses balance
open_p = content.count('(')
close_p = content.count(')')
print(f"File parentheses: open={open_p}, close={close_p}")

open_b = content.count('{')
close_b = content.count('}')
print(f"File braces: open={open_b}, close={close_b}")
