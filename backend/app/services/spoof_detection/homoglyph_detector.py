# Lightweight homoglyph detector and normalizer without external dependencies

HOMOGLYPH_MAP = {
    # Number substitutions
    '0': 'o',
    '1': 'l',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '8': 'b',
    # Symbol substitutions
    '@': 'a',
    '$': 's',
    # Cyrillic lookalikes mapping to Latin counterparts
    '\u0430': 'a',  # Cyrillic small a
    '\u0441': 'c',  # Cyrillic small es (looks like c)
    '\u0435': 'e',  # Cyrillic small ie (looks like e)
    '\u0455': 's',  # Cyrillic small dze (looks like s)
    '\u0456': 'i',  # Cyrillic small i
    '\u0458': 'j',  # Cyrillic small je (looks like j)
    '\u043e': 'o',  # Cyrillic small o
    '\u0440': 'p',  # Cyrillic small er (looks like p)
    '\u0445': 'x',  # Cyrillic small ha (looks like x)
    '\u0443': 'y',  # Cyrillic small u (looks like y)
    '\u045c': 'k',  # Cyrillic small kje (looks like k)
    '\u043d': 'h',  # Cyrillic small en (looks like h/n)
    '\u0432': 'b',  # Cyrillic small ve (looks like b)
}

def normalize_homoglyphs(text: str) -> str:
    """
    Normalizes character substitutions (e.g. 0->o, 1->l, Cyrillic lookalikes)
    to help in comparing candidate domains with protected brand names.
    """
    if not text:
        return ""
        
    text = text.lower()
    
    # Handle multi-character substitutions first
    text = text.replace("vv", "w")
    text = text.replace("rn", "m")  # r + n -> m lookalike
    text = text.replace("cl", "d")  # c + l -> d lookalike
    
    # Character by character translation
    normalized_chars = []
    for char in text:
        if char in HOMOGLYPH_MAP:
            normalized_chars.append(HOMOGLYPH_MAP[char])
        else:
            normalized_chars.append(char)
            
    return "".join(normalized_chars)
