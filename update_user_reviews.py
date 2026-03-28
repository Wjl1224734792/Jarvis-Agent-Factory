from pathlib import Path
path = Path('packages/db/src/seed.ts')
text = path.read_text(encoding='utf-8')
start_user = text.index('  const userSeeds =')
end_user = text.index('] as const;', start_user) + len('] as const;')
new_user = '''  const userSeeds = [
    { phone:  13800138101, displayName: Pilot One },
    { phone: 13800138102, displayName: Pilot Two },
    { phone: 13800138103, displayName: Pilot Three },
    { phone: 13800138104, displayName: Pilot Four },
    { phone: 13800138105, displayName: Pilot Five },
    { phone: 13800138106, displayName: Pilot Six },
    { phone: 13800138107, displayName: Pilot Seven },
    { phone: 13800138108, displayName: Pilot Eight },
    { phone: 13800138109, displayName: Pilot Nine },
    { phone: 13800138110, displayName: Pilot Ten }
  ] as const;'''
text = text[:start_user] + new_user + text[end_user:]
start_review = text.index('  const reviewSeeds =')
end_review = text.index('] as const;', start_review) + len('] as const;')
new_review = '''  const reviewSeeds = [
    [mini-4-pro, 13800138101, Lightweight and very stable.],
    [mini-4-pro, 13800138102, Good for beginners.],
    [mavic-3-pro, 13800138103, Great for commercial output.],
    [mavic-3-pro, 13800138104, Top overall performance.],
    [evo-lite-plus, 13800138105, Solid all-around option.],
    [eh216-s, 13800138106, Interesting low-altitude mobility sample.],
    [joby-s4, 13800138107, A promising eVTOL route in city corridors.],
    [vision-jet-g2-plus, 13800138108, Great personal jet experience.],
    [joby-s4, 13800138109, Balanced cargo routine and stability.],
    [vision-jet-g2-plus, 13800138110, Exceptional control at mid-speed climbs.]
  ] as const;'''
text = text[:start_review] + new_review + text[end_review:]
path.write_text(text, encoding='utf-8', newline='\r\n')
