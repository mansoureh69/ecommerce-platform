using System.Xml.Linq;

namespace EcommercePlatform.ArchitectureTests;
public sealed class BoundaryTests
{
    private static string Root()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "EcommercePlatform.slnx")))
            directory = directory.Parent;
        return directory?.FullName ?? throw new InvalidOperationException("Repository root not found.");
    }

    [Fact]
    public void Project_references_obey_layers_and_explicit_module_dependencies()
    {
        var allowed = new Dictionary<string, string[]>
        {
            ["Identity"] = [],
            ["Catalog"] = [],
            ["Inventory"] = ["Catalog"],
            ["Pricing"] = ["Catalog"],
            ["Cart"] = ["Catalog"],
            ["Orders"] = ["Catalog", "Pricing", "Inventory", "Cart"],
            ["Payments"] = ["Orders"]
        };
        foreach (var path in Directory.GetFiles(Path.Combine(Root(), "src"), "*.csproj", SearchOption.AllDirectories))
        {
            var name = Path.GetFileNameWithoutExtension(path);
            var doc = XDocument.Load(path);
            var refs = doc.Descendants("ProjectReference").Select(x => Path.GetFileNameWithoutExtension(x.Attribute("Include")!.Value)).ToArray();
            if (name.EndsWith(".Domain"))
            {
                Assert.All(refs, r => Assert.Equal("EcommercePlatform.BuildingBlocks.Domain", r));
                Assert.Empty(doc.Descendants("PackageReference"));
                Assert.Empty(doc.Descendants("FrameworkReference"));
            }

            if (!name.Contains(".Modules."))
                continue;
            var parts = name.Split('.');
            var module = parts[2];
            var layer = parts[3];
            foreach (var reference in refs.Where(r => r.Contains(".Modules.")))
            {
                var dependency = reference.Split('.');
                if (dependency[2] == module)
                    Assert.True(layer == "Application" && dependency[3] == "Domain" || layer == "Infrastructure" && dependency[3] == "Application");
                else
                {
                    Assert.Equal("Application", layer);
                    Assert.Equal("Application", dependency[3]);
                    Assert.Contains(dependency[2], allowed[module]);
                }
            }
        }
    }

    [Fact]
    public void Shared_projects_do_not_depend_on_modules_and_applications_do_not_use_EF()
    {
        var root = Root();
        foreach (var file in Directory.GetFiles(Path.Combine(root, "src", "BuildingBlocks"), "*.cs", SearchOption.AllDirectories).Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")))
            Assert.DoesNotContain("EcommercePlatform.Modules.", File.ReadAllText(file));
        foreach (var file in Directory.GetFiles(Path.Combine(root, "src", "Modules"), "*.cs", SearchOption.AllDirectories).Where(f => f.Contains(".Application") && !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")))
        {
            var text = File.ReadAllText(file);
            Assert.DoesNotContain("Microsoft.EntityFrameworkCore", text);
            Assert.DoesNotContain(".Infrastructure", text);
            var module = Path.GetRelativePath(Path.Combine(root, "src", "Modules"), file).Split(Path.DirectorySeparatorChar)[0];
            foreach (var other in new[]
            {
                "Identity",
                "Catalog",
                "Inventory",
                "Pricing",
                "Cart",
                "Orders",
                "Payments"
            }.Where(m => m != module))
                Assert.DoesNotContain($"Modules.{other}.Domain", text);
        }
    }

    [Fact]
    public void Generic_core_contains_no_flower_specific_fields()
    {
        foreach (var file in Directory.GetFiles(Path.Combine(Root(), "src"), "*.cs", SearchOption.AllDirectories).Where(f => !f.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}")))
        {
            var text = File.ReadAllText(file);
            Assert.DoesNotContain("FlowerType", text);
            Assert.DoesNotContain("ArrangementType", text);
            Assert.DoesNotContain("SweetFlowerShop", text);
        }
    }
}
