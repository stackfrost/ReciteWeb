import { describe, it, expect, beforeEach } from 'vitest';
import { QuarantineVault, quarantineSource, reconstituteSource } from '../environment-quarantine';

describe('LaTeX Environment Quarantining Engine', () => {
  let vault: QuarantineVault;

  beforeEach(() => {
    vault = new QuarantineVault();
  });

  it('Test 1: should extract complex multi-line \\begin{align*} with nested brackets', () => {
    const rawTex = `
The equation is given by:
\\begin{align*}
  F(x) &= \\int_0^\\infty e^{-x^2} dx \\\\
  &= \\frac{\\sqrt{\\pi}}{2} \\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}
\\end{align*}
End of equation.
    `;
    const quarantined = quarantineSource(rawTex, vault);
    
    // Check replacement
    expect(quarantined).not.toContain('\\begin{align*}');
    expect(quarantined).toContain('[[RECITEAI_QUARANTINE_DISPLAY_MATH_0_');
    expect(quarantined).toContain('The equation is given by:');
    expect(quarantined).toContain('End of equation.');

    const blocks = vault.getAll();
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('display_math');
    expect(blocks[0].rawContent).toContain('\\begin{pmatrix}');
    expect(blocks[0].rawContent).toContain('\\end{align*}');
  });

  it('Test 2: should handle inline variables intermixed with escaped \\$ currency symbols', () => {
    const rawTex = `The cost is \\$50 for the variable $x_i$, but only \\$20 for $y^2$.`;
    const quarantined = quarantineSource(rawTex, vault);
    
    expect(quarantined).not.toContain('$x_i$');
    expect(quarantined).not.toContain('$y^2$');
    expect(quarantined).toContain('\\$50'); // Should preserve escaped dollar
    expect(quarantined).toContain('\\$20');

    const blocks = vault.getAll();
    expect(blocks.length).toBe(2);
    expect(blocks[0].type).toBe('inline_math');
    expect(blocks[0].rawContent).toBe('$x_i$');
    expect(blocks[1].rawContent).toBe('$y^2$');
  });

  it('Test 3: should extract massive tikzpicture blocks with nested loops', () => {
    const rawTex = `
Figure 1:
\\begin{tikzpicture}[scale=1.5]
  \\foreach \\x in {1,2,3} {
    \\node at (\\x, 0) {\\x};
  }
  \\draw (0,0) -- (1,1);
\\end{tikzpicture}
See Figure 1.`;
    const quarantined = quarantineSource(rawTex, vault);
    
    expect(quarantined).toContain('Figure 1:');
    expect(quarantined).toContain('See Figure 1.');
    expect(quarantined).not.toContain('\\begin{tikzpicture}');
    
    const blocks = vault.getAll();
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('tikz');
    expect(blocks[0].rawContent).toContain('\\foreach \\x in {1,2,3}');
  });

  it('should extract primitive display math $$ ... $$ and \\[ ... \\]', () => {
    const rawTex = `
Start
$$ E = mc^2 $$
Middle
\\[ a^2 + b^2 = c^2 \\]
End`;
    const quarantined = quarantineSource(rawTex, vault);
    
    const blocks = vault.getAll();
    expect(blocks.length).toBe(2);
    expect(blocks[0].rawContent).toBe('$$ E = mc^2 $$');
    expect(blocks[1].rawContent).toBe('\\[ a^2 + b^2 = c^2 \\]');
  });

  it('Test 4: Reconstitution Engine with LLM Drift Protection', () => {
    const rawTex = `Here is $E=mc^2$ and an equation: \\begin{equation} y=mx+b \\end{equation}`;
    const quarantined = quarantineSource(rawTex, vault);
    
    const blocks = vault.getAll();
    const token2 = blocks[0].id; // display (extracted first in Pass 1)
    const token1 = blocks[1].id; // inline (extracted third in Pass 3)
    
    // Simulate LLM output where it hallucinates math boundaries around the tokens
    const llmOutput = `The modified text contains: $${token1}$ and also we have:
$$${token2}$$
It even generated it twice: $${token1}$!`;

    const reconstituted = reconstituteSource(llmOutput, vault);
    
    // The reconstitution should strip the outer hallucinated $ and $$ wrappers 
    // and replace exactly with the original rawContent which already contains the boundaries.
    expect(reconstituted).toContain(`The modified text contains: $E=mc^2$ and also we have:\n\\begin{equation} y=mx+b \\end{equation}\nIt even generated it twice: $E=mc^2$!`);
    
    // It should not contain double dollars where not appropriate
    expect(reconstituted).not.toContain('$$E=mc^2$$');
    expect(reconstituted).not.toContain('$$\\begin{equation}');
  });
});
